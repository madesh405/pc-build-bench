# PC Build Bench - Clean Fixed Frontend

Core workflow:
Module 1 Component Management
→ Module 2 PC Build Configuration
→ Module 3 Compatibility & Analysis

Supporting modules:
- Login
- My Builds
- Workload Evaluation
- Recommendations
- User Profile
- Admin component management demo

Important navigation behavior:
- Selecting a component from Module 1 while entering from Module 2 returns to Module 2.
- Clicking Change on a build slot opens Module 1 already filtered to that category.
- Module 3 reads the same selected state from Module 2.
- Login is required before the build workflow.
- The dev script exposes Vite on the local network.

Run:
npm install
npm run dev
