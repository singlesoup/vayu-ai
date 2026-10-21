// Task 3.4: embedding pipeline — chunk notes, embed via EmbeddingGemma,
// store a local vector index beside the notes, and search it with cosine
// similarity.
use std::collections::BTreeMap;
use std::io::ErrorKind;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::error::VayuError;
use crate::ollama;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chunk {
    pub text: String,
    pub embedding: Vec<f32>,
}

/// Per-date index entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateEntry {
    pub chunks: Vec<Chunk>,
}

/// The on-disk index: `<notes_dir>/.vayu_index.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Index {
    pub version: u32,
    pub updated: String,
    pub entries: BTreeMap<String, DateEntry>,
}

pub const INDEX_VERSION: u32 = 1;
pub const INDEX_FILE_NAME: &str = ".vayu_index.json";

/// Split `text` into chunks of at most `max_chars`, preferring sentence
/// boundaries (`.`, `!`, `?` followed by whitespace or end). A sentence
/// longer than `max_chars` is emitted as its own (oversized) chunk.
pub fn chunk_text(text: &str, max_chars: usize) -> Vec<String> {
    if text.is_empty() || max_chars == 0 {
        return Vec::new();
    }
    let sentences = split_sentences(text);
    let mut chunks = Vec::new();
    let mut current = String::new();
    for sentence in sentences {
        let candidate = if current.is_empty() {
            sentence.clone()
        } else {
            format!("{} {}", current, sentence)
        };
        if candidate.len() <= max_chars {
            current = candidate;
        } else {
            if !current.is_empty() {
                chunks.push(std::mem::take(&mut current));
            }
            if sentence.len() > max_chars {
                // Hard-break an oversized sentence.
                for piece in sentence.as_bytes().chunks(max_chars) {
                    chunks.push(String::from_utf8_lossy(piece).into_owned());
                }
            } else {
                current = sentence;
            }
        }
    }
    if !current.is_empty() {
        chunks.push(current);
    }
    chunks
}

/// Split text into sentences ending with `.`, `!`, or `?`. Each returned
/// sentence is trimmed of surrounding whitespace so chunks re-join cleanly
/// with a single space.
fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut start = 0;
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '.' || chars[i] == '!' || chars[i] == '?' {
            let sentence = text[start..=i].trim();
            if !sentence.is_empty() {
                sentences.push(sentence.to_string());
            }
            start = i + 1;
            i += 1;
        } else {
            i += 1;
        }
    }
    let tail = text[start..].trim();
    if !tail.is_empty() {
        sentences.push(tail.to_string());
    }
    sentences
}

/// Cosine similarity of `a` and `b`. Different lengths or a zero vector
/// yields `0.0`; identical unit vectors yield `1.0`.
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let (mut dot, mut na, mut nb) = (0.0f32, 0.0f32, 0.0f32);
    for (&x, &y) in a.iter().zip(b.iter()) {
        dot += x * y;
        na += x * x;
        nb += y * y;
    }
    let norm = na.sqrt() * nb.sqrt();
    if norm == 0.0 {
        return 0.0;
    }
    dot / norm
}

fn now_iso() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_default()
}

/// Read the index from `index_path`. Missing file → empty index.
pub fn read_index(index_path: &Path) -> Result<Index, VayuError> {
    match std::fs::read_to_string(index_path) {
        Ok(text) => serde_json::from_str(&text).map_err(|e| {
            VayuError::io(format!("index parse error: {e}"))
        }),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(Index {
            version: INDEX_VERSION,
            updated: now_iso(),
            entries: BTreeMap::new(),
        }),
        Err(err) => Err(VayuError::io(format!(
            "couldn't read index: {err}"
        ))),
    }
}

/// Write the index to `index_path` atomically (temp file + rename).
pub fn write_index(index_path: &Path, index: &Index) -> Result<(), VayuError> {
    if let Some(parent) = index_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            VayuError::io(format!("couldn't create index folder: {e}"))
        })?;
    }
    let text = serde_json::to_string_pretty(index).map_err(|e| {
        VayuError::other(format!("index serialise error: {e}"))
    })?;
    let tmp = index_path.with_extension("index.tmp");
    std::fs::write(&tmp, text).map_err(|e| {
        VayuError::io(format!("couldn't write index: {e}"))
    })?;
    std::fs::rename(&tmp, index_path).map_err(|e| {
        VayuError::io(format!("couldn't rename index: {e}"))
    })
}

/// Rebuild the whole index from every `YYYY-MM-DD.md` in `notes_dir`:
/// chunk each note, embed each chunk with `embeddinggemma`, write the index.
/// Returns the number of dates indexed and total chunks.
pub async fn reindex(
    notes_dir: &Path,
    index_path: &Path,
) -> Result<IndexStats, VayuError> {
    let dates = crate::notes::list_notes(notes_dir)?;
    let mut entries = BTreeMap::new();
    let mut total_chunks = 0usize;
    for date in &dates {
        let note = crate::notes::read_note(notes_dir, date)?;
        if !note.exists || note.content.trim().is_empty() {
            continue;
        }
        let chunks = chunk_text(&note.content, 500);
        let mut embedded = Vec::with_capacity(chunks.len());
        for chunk in &chunks {
            let embedding = ollama::run_embeddings(
                &ollama::base_url(),
                ollama::EMBEDDING_TAG,
                chunk,
                ollama::STATUS_TIMEOUT,
            )
            .await?;
            embedded.push(Chunk {
                text: chunk.clone(),
                embedding,
            });
        }
        total_chunks += embedded.len();
        entries.insert(date.clone(), DateEntry { chunks: embedded });
    }
    let index = Index {
        version: INDEX_VERSION,
        updated: now_iso(),
        entries,
    };
    write_index(index_path, &index)?;
    Ok(IndexStats {
        indexed: index.entries.len(),
        chunks: total_chunks,
    })
}

/// Cosine-search the index: embed `query` with `embeddinggemma`, score every
/// chunk, return the top `top_k` sorted by score descending (score > 0).
pub async fn search_index(
    index_path: &Path,
    query: &str,
    top_k: usize,
) -> Result<Vec<SearchHit>, VayuError> {
    let index = read_index(index_path)?;
    if index.entries.is_empty() {
        return Ok(Vec::new());
    }
    let query_embedding = ollama::run_embeddings(
        &ollama::base_url(),
        ollama::EMBEDDING_TAG,
        query,
        ollama::STATUS_TIMEOUT,
    )
    .await?;
    let mut hits: Vec<(f32, SearchHit)> = Vec::new();
    for (date, entry) in &index.entries {
        for chunk in &entry.chunks {
            let score = cosine_similarity(&query_embedding, &chunk.embedding);
            if score > 0.0 {
                hits.push((
                    score,
                    SearchHit {
                        date: date.clone(),
                        text: chunk.text.clone(),
                        score,
                    },
                ));
            }
        }
    }
    hits.sort_by(|a, b| {
        b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal)
    });
    hits.truncate(top_k);
    Ok(hits.into_iter().map(|(_, hit)| hit).collect())
}

/// One search hit: the date, the matching chunk text, and the cosine score.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub date: String,
    pub text: String,
    pub score: f32,
}

/// Result of `reindex`: how many dates were indexed and how many chunks.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStats {
    pub indexed: usize,
    pub chunks: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    #[test]
    fn chunk_text_respects_sentence_boundaries() {
        let text = "First sentence. Second sentence! Third sentence? Fourth.";
        let chunks = chunk_text(text, 40);
        assert!(!chunks.is_empty());
        for c in &chunks {
            assert!(
                c.len() <= 40 || c.len() == text.len(),
                "chunk too long: {c:?}"
            );
        }
        let joined = chunks.join(" ");
        assert_eq!(joined, text);
    }

    #[test]
    fn chunk_text_caps_long_text() {
        let text = "x".repeat(500);
        let chunks = chunk_text(&text, 100);
        assert!(chunks.len() >= 5);
        for c in &chunks {
            assert!(c.len() <= 100, "chunk too long: {} {}", c.len(), c);
        }
    }

    #[test]
    fn chunk_text_empty_is_empty() {
        assert_eq!(chunk_text("", 100), Vec::<String>::new());
    }

    #[test]
    fn cosine_identical_is_one() {
        let v = vec![1.0, 2.0, 3.0];
        assert!((cosine_similarity(&v, &v) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn cosine_orthogonal_is_zero() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 0.0).abs() < 1e-6);
    }

    #[test]
    fn cosine_opposite_is_minus_one() {
        let a = vec![1.0, 0.0];
        let b = vec![-1.0, 0.0];
        assert!((cosine_similarity(&a, &b) - (-1.0)).abs() < 1e-6);
    }

    #[test]
    fn cosine_zero_vector_is_zero() {
        let a = vec![0.0, 0.0];
        let b = vec![1.0, 2.0];
        assert!((cosine_similarity(&a, &b) - 0.0).abs() < 1e-6);
    }

    #[test]
    fn cosine_different_lengths_is_zero() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0, 2.0, 3.0];
        assert!((cosine_similarity(&a, &b) - 0.0).abs() < 1e-6);
    }

    #[test]
    fn read_index_missing_file_is_empty() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(INDEX_FILE_NAME);
        let index = read_index(&path).unwrap();
        assert_eq!(index.version, INDEX_VERSION);
        assert!(index.entries.is_empty());
    }

    #[test]
    fn write_then_read_index_round_trips() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(INDEX_FILE_NAME);
        let index = Index {
            version: INDEX_VERSION,
            updated: "2026-10-21T00:00:00Z".to_string(),
            entries: BTreeMap::from([(
                "2026-10-21".to_string(),
                DateEntry {
                    chunks: vec![Chunk {
                        text: "hello world".to_string(),
                        embedding: vec![0.1, 0.2],
                    }],
                },
            )]),
        };
        write_index(&path, &index).unwrap();
        let back = read_index(&path).unwrap();
        assert_eq!(back.version, INDEX_VERSION);
        assert_eq!(back.entries.len(), 1);
        let entry = back.entries.get("2026-10-21").unwrap();
        assert_eq!(entry.chunks.len(), 1);
        assert_eq!(entry.chunks[0].text, "hello world");
    }

    #[test]
    fn search_index_empty_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(INDEX_FILE_NAME);
        write_index(
            &path,
            &Index {
                version: INDEX_VERSION,
                updated: now_iso(),
                entries: BTreeMap::new(),
            },
        )
        .unwrap();
        let hits = block_on_search(&path, "anything", 5);
        assert!(hits.is_empty());
    }

    /// Sync wrapper for `search_index` so the empty-index case can be a plain
    /// unit test without pulling a tokio runtime.
    fn block_on_search(path: &Path, query: &str, top_k: usize) -> Vec<SearchHit> {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(search_index(path, query, top_k)).unwrap()
    }
}
