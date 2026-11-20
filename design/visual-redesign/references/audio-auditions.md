# Audition pages for sound

The owner chooses sounds by ear, and the only way to put several renditions in front of them
is a page that plays them. The pattern that worked: one page with several renditions of a cue, several behaviours for the part that depends on the player, and a bench to try them.

## Port the product's audio chain, so "Today" really is today

A comparison is only fair if the baseline is the shipping sound. Port it from source rather
than imitating it:

- **The chain**: master gain and headroom, the limiter (threshold, knee, ratio, attack,
  release), each bus's level, and any room or reverb (a generated impulse, its filter, the
  wet amount).
- **The voices**: the product's `tone`, `noise` (with its raised-cosine attack and filter),
  `thud`, `swell`, as it defines them.
- **The cue itself**, with its constants, plus whatever follows it in the product (a card
  flip, a chime, a bust), so a rendition is heard in context.

## Make the comparison honest

- **Level-match.** Put an `AnalyserNode` after the limiter, expose the running peak
  (`window.__peak`, with a reset), and measure every rendition in a headless browser. Bring
  each within a few dB of today's before publishing; a louder option wins an A/B for being
  louder (in one round two renditions had to come down 6 dB).
- Play each at the product's real timings, and offer the settings that change the sound
  (a tier, a win or a miss).
- Where the sound depends on the player (a manual peel), give the page an interaction that
  stands in for it (a slider standing in for the corner), and offer the behaviours separately
  from the sounds, so the owner can mix one of each.
- Say in the reply that you can measure but not hear: the choice is the owner's ear.

## After the pick

Build it into the product's sound module, keep its scheduling tests honest (prove a changed
one with a sabotage), and run the audio measurement on the real moment before and after: no
clipping, the peak and level against the old capture, and the cue landing where it should.
