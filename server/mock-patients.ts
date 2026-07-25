import { MockPatient } from "@/types";

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: "amelia-layered",
    displayName: "Amelia Hart",
    sexProfile: "female",
    ageRange: "49",
    menopauseStage: "Perimenopause",
    adhdContext: "Longstanding attention and organization strain with recent midlife amplification.",
    profileNotes:
      "High-output professional who reports childhood-to-adult task initiation friction, now complicated by variable sleep, cycle changes, and recovery cost."
  },
  {
    id: "renee-menopause-amplified",
    displayName: "Renee Collins",
    sexProfile: "female",
    ageRange: "55",
    menopauseStage: "Postmenopause",
    adhdContext: "No clear longstanding ADHD history in the mock profile; recent cognition strain tracks with sleep and body-state shifts.",
    profileNotes:
      "Stable prior functioning with newer word-finding, sleep restoration, vasomotor, and energy-stability concerns."
  },
  {
    id: "noor-adhd-consistent",
    displayName: "Noor Bennett",
    sexProfile: "female",
    ageRange: "46",
    menopauseStage: "Cycling irregularly",
    adhdContext: "Cross-setting attention, time, task switching, and working-memory strain across adult life.",
    profileNotes:
      "Midlife changes are present but the stronger mock signal is a longstanding executive-function pattern across work, home, and relationships."
  },
  {
    id: "tessa-high-load-indeterminate",
    displayName: "Tessa Morgan",
    sexProfile: "female",
    ageRange: "51",
    menopauseStage: "Perimenopause",
    adhdContext: "Indeterminate pattern; high role load, interruptions, sleep variability, and caregiving demands are all plausible contributors.",
    profileNotes:
      "Useful for testing caveats, coach verification questions, and non-overinterpretation in a mixed but lower-confidence intake."
  },
  {
    id: "marcus-longstanding-core",
    displayName: "Marcus Reed",
    sexProfile: "male",
    ageRange: "48",
    menopauseStage: "Not applicable",
    adhdContext: "Longstanding attention, activation, and time-management strain across work and home.",
    profileNotes:
      "Shared-core male test profile with cross-setting executive-function friction and recent role-load pressure."
  },
  {
    id: "eli-current-state-core",
    displayName: "Eli Mercer",
    sexProfile: "male",
    ageRange: "53",
    menopauseStage: "Not applicable",
    adhdContext: "No clear longstanding pattern in the mock profile; recent capacity strain varies with energy, stress, and recovery.",
    profileNotes:
      "Shared-core male test profile for current-state amplifiers without a hormonal-module interpretation."
  }
];
