# CoRT (Chain of Recursive Thoughts) 🧠🔄

## TL;DR: I made my AI think harder by making it argue with itself repeatedly. It works stupidly well.

### What is this?
CoRT makes AI models recursively think about their responses, generate alternatives, and pick the best one. It's like giving the AI the ability to doubt itself and try again... and again... and again.

### Does it actually work?
YES. I tested it with Mistral 3.1 24B and it went from "meh" to "holy crap", especially for such a small model, at programming tasks.


## How it works
1. AI generates initial response
2. AI decides how many "thinking rounds" it needs
3. For each round:
   - Generates 3 alternative responses
   - Evaluates all responses
   - Picks the best one
4. Final response is the survivor of this AI battle royale

## Examples


Mistral 3.1 24B + CoRT
![rec](https://github.com/user-attachments/assets/acbcf1f9-4715-4d2c-a31c-38b349602380)

Mistral 3.1 24B non CoRT
![non-rec](https://github.com/user-attachments/assets/9c4f6af9-0a8f-4c62-920c-f272fce225c1)


## Try it yourself
```python
pip install -r requirements.txt
export OPENROUTER_API_KEY="your-key-here"
python recursive-thinking-ai.py
```

### The Secret Sauce
The magic is in:

 - Self-evaluation
 - Competitive alternative generation
 - Iterative refinement
 - Dynamic thinking depth

### Contributing
Found a way to make it even better? PR's welcome!

### License
MIT - Go wild with it
