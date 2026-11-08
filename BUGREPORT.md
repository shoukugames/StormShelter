# Reporting a Bug in StormShelter

Thank you for helping make StormShelter better! If something doesn't work as
expected, please send a report to **info@shoukugames.org** (or through
https://shoukugames.org/) and include as much of the template below as you can.

## Before you report

1. Make sure you are on the latest version. The version number is in the
   bottom-right corner of the title screen and in **Credits**.
2. Try restarting the game.
3. If the problem involves a particular level, note the **level number** and
   **difficulty** shown in the top-left corner while playing.

## Bug report template

```
**StormShelter version:** (e.g. v0.1.0)
**Operating system:** (e.g. Windows 11, Ubuntu 24.04, Debian 12)
**Package type:** (.deb / Windows installer / Windows portable / from source)

**Level and difficulty:** (e.g. Level 42, Medium; or "title screen")

**What happened:**
(Describe what went wrong.)

**What I expected to happen:**

**Steps to reproduce:**
1.
2.
3.

**How often does it happen?** (every time / sometimes / once)

**Screenshots or video:** (if possible)

**Anything else?** (e.g. sound or music on/off, fullscreen, touch screen)
```

## Common things to check

| Problem | Things to try |
| --- | --- |
| No sound or music | Check the **Music** and **Sounds** toggles on the title screen and your system volume. Audio starts after the first click or tap. |
| Game window is too small | Use the **Fullscreen** button on the title screen or press `F11`. |
| A level seems impossible | Every level is checked by the physics engine before release. Try heavier materials, walls on both sides, and a roof that rests on two walls. If you still think it can't be done, please report it with the level number and difficulty. |
| Lost progress | Progress is saved automatically after every level and when you leave a level. Saves are stored in the game's user data folder, so deleting that folder resets the game. |

## Where save data lives

- **Linux:** `~/.config/StormShelter/`
- **Windows:** `%APPDATA%\StormShelter\`

You can include files from this folder if a problem involves save slots.

## Security issues

Please report security problems privately to **info@shoukugames.org** rather
than publicly.
