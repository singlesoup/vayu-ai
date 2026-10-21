// Task 2.1/2.2: hardware check + tier logic (PRD §7).
//
// RED — nothing is implemented yet; these tests fail to compile until
// feat(2.1/2.2) adds `tier_for`, `Tier`, `tier_from_env`, `hardware_report`
// and the `hardware_check` command.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_boundaries_ram() {
        assert_eq!(tier_for(16.0, 10.0), Tier::Green);
        assert_eq!(tier_for(15.9, 10.0), Tier::Yellow);
        assert_eq!(tier_for(32.0, 500.0), Tier::Green);
        assert_eq!(tier_for(8.0, 50.0), Tier::Yellow);
        assert_eq!(tier_for(7.9, 50.0), Tier::Red);
    }

    #[test]
    fn tier_boundaries_disk() {
        assert_eq!(tier_for(16.0, 10.0), Tier::Green);
        assert_eq!(tier_for(16.0, 9.9), Tier::Yellow);
        assert_eq!(tier_for(8.0, 8.0), Tier::Yellow);
        assert_eq!(tier_for(8.0, 7.9), Tier::Red);
        assert_eq!(tier_for(4.0, 500.0), Tier::Red);
    }

    #[test]
    fn dev_override_forces_tier_in_debug() {
        unsafe {
            std::env::set_var("VAYU_DEV_TIER", "Yellow");
        }
        assert_eq!(tier_from_env(), Some(Tier::Yellow));
        unsafe {
            std::env::remove_var("VAYU_DEV_TIER");
        }
        assert_eq!(tier_from_env(), None);
    }
}
