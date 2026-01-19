# Avatar Generation Prompts

This document stores the "winning" prompts used to generate the family avatars, ensuring consistency in style and quality across all characters.

## 1. Step 1: Realistic "Cute" Studio Portrait

**Goal:** Create a high-quality, photorealistic base image with a clean white background and a heartwarming expression.

**Prompt Template:**

> "Extremely cute and heartwarming studio portrait of a [young girl/boy] with Down syndrome (resembling reference), big contagious smile, sparkling eyes, looking directly at camera with a playful expression. Soft, flattering lighting that highlights [her/his] rosy cheeks. Pure white background #FFFFFF. High quality, sharp details but soft atmosphere, 8k, adorable, happy vibes."

**Notes:**

- Input matching reference images is critical.
- Ensure `#FFFFFF` background for easy extraction later (though we re-crop/mask if needed).

## 2. Step 2: Pixar Style Stylization

**Goal:** Convert the realistic studio portrait into a 3D Pixar-style character while retaining identity.

**Prompt Template:**

> "3D Pixar style character render of the [girl/boy] in the reference image. High quality animation style, wide eyes, expressive, cute and friendly. Soft studio lighting, 3D render, C4D, Octane render, 8k, Disney aesthetic. Pure white background."

**Notes:**

- Use the _Generated Studio Portrait_ from Step 1 as the input reference for this step.

---

## Characters Created

### Tamar

- **Step 1 Result:** `tamar_studio_cute_v2.png`
- **Step 2 Result:** `tamar_style_pixar.png` (Final Crop: `tamar_style_pixar_crop.png`)
