import openai
import os
from typing import List, Dict
import json
import requests
from datetime import datetime
import sys
import time

class EnhancedRecursiveThinkingChat:
    def __init__(self, api_key: str = None, model: str = "mistralai/mistral-small-3.1-24b-instruct:free"):
        """Initialize with OpenRouter API."""
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model = model
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Recursive Thinking Chat",
            "Content-Type": "application/json"
        }
        self.conversation_history = []
        self.full_thinking_log = []
    
    def _call_api(self, messages: List[Dict], temperature: float = 0.7, stream: bool = True) -> str:
        """Make an API call to OpenRouter with streaming support."""
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream,
            "reasoning": {
                "max_tokens": 10386,
            }
        }
        
        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload, stream=stream)
            response.raise_for_status()
            
            if stream:
                full_response = ""
                for line in response.iter_lines():
                    if line:
                        line = line.decode('utf-8')
                        if line.startswith("data: "):
                            line = line[6:]
                            if line.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(line)
                                if "choices" in chunk and len(chunk["choices"]) > 0:
                                    delta = chunk["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        full_response += content
                                        print(content, end="", flush=True)
                            except json.JSONDecodeError:
                                continue
                print()  # New line after streaming
                return full_response
            else:
                return response.json()['choices'][0]['message']['content'].strip()
        except Exception as e:
            print(f"API Error: {e}")
            return "Error: Could not get response from API"
    
    def _determine_thinking_rounds(self, prompt: str) -> int:
        """Let the model decide how many rounds of thinking are needed."""
        meta_prompt = f"""Given this message: "{prompt}"
        
How many rounds of iterative thinking (1-5) would be optimal to generate the best response?
Consider the complexity and nuance required.
Respond with just a number between 1 and 5."""
        
        messages = [{"role": "user", "content": meta_prompt}]
        
        print("\n=== DETERMINING THINKING ROUNDS ===")
        response = self._call_api(messages, temperature=0.3, stream=True)
        print("=" * 50 + "\n")
        
        try:
            rounds = int(''.join(filter(str.isdigit, response)))
            return min(max(rounds, 1), 5)
        except:
            return 3
    
    def _generate_alternatives(self, base_response: str, prompt: str, num_alternatives: int = 3) -> List[str]:
        """Generate alternative responses."""
        alternatives = []
        
        for i in range(num_alternatives):
            print(f"\n=== GENERATING ALTERNATIVE {i+1} ===")
            alt_prompt = f"""Original message: {prompt}
            
Current response: {base_response}

Generate an alternative response that might be better. Be creative and consider different approaches.
Alternative response:"""
            
            messages = self.conversation_history + [{"role": "user", "content": alt_prompt}]
            alternative = self._call_api(messages, temperature=0.7 + i * 0.1, stream=True)
            alternatives.append(alternative)
            print("=" * 50)
        
        return alternatives
    
    def _evaluate_responses(self, prompt: str, current_best: str, alternatives: List[str]) -> tuple[str, str]:
        """Evaluate responses and select the best one."""
        print("\n=== EVALUATING RESPONSES ===")
        eval_prompt = f"""Original message: {prompt}

Evaluate these responses and choose the best one:

Current best: {current_best}

Alternatives:
{chr(10).join([f"{i+1}. {alt}" for i, alt in enumerate(alternatives)])}

Which response best addresses the original message? Consider accuracy, clarity, and completeness.
First, respond with ONLY 'current' or a number (1-{len(alternatives)}).
Then on a new line, explain your choice in one sentence."""
        
        messages = [{"role": "user", "content": eval_prompt}]
        evaluation = self._call_api(messages, temperature=0.2, stream=True)
        print("=" * 50)
        
        # Better parsing
        lines = [line.strip() for line in evaluation.split('\n') if line.strip()]
        
        choice = 'current'
        explanation = "No explanation provided"
        
        if lines:
            first_line = lines[0].lower()
            if 'current' in first_line:
                choice = 'current'
            else:
                for char in first_line:
                    if char.isdigit():
                        choice = char
                        break
            
            if len(lines) > 1:
                explanation = ' '.join(lines[1:])
        
        if choice == 'current':
            return current_best, explanation
        else:
            try:
                index = int(choice) - 1
                if 0 <= index < len(alternatives):
                    return alternatives[index], explanation
            except:
                pass
        
        return current_best, explanation
    
    def think_and_respond(self, user_input: str, verbose: bool = True) -> Dict:
        """Process user input with recursive thinking."""
        print("\n" + "=" * 50)
        print("🤔 RECURSIVE THINKING PROCESS STARTING")
        print("=" * 50)
        
        thinking_rounds = self._determine_thinking_rounds(user_input)
        
        if verbose:
            print(f"\n🤔 Thinking... ({thinking_rounds} rounds needed)")
        
        # Initial response
        print("\n=== GENERATING INITIAL RESPONSE ===")
        messages = self.conversation_history + [{"role": "user", "content": user_input}]
        current_best = self._call_api(messages, stream=True)
        print("=" * 50)
        
        thinking_history = [{"round": 0, "response": current_best, "selected": True}]
        
        # Iterative improvement
        for round_num in range(1, thinking_rounds + 1):
            if verbose:
                print(f"\n=== ROUND {round_num}/{thinking_rounds} ===")
            
            # Generate alternatives
            alternatives = self._generate_alternatives(current_best, user_input)
            
            # Store alternatives in history
            for i, alt in enumerate(alternatives):
                thinking_history.append({
                    "round": round_num,
                    "response": alt,
                    "selected": False,
                    "alternative_number": i + 1
                })
            
            # Evaluate and select best
            new_best, explanation = self._evaluate_responses(user_input, current_best, alternatives)
            
            # Update selection in history
            if new_best != current_best:
                for item in thinking_history:
                    if item["round"] == round_num and item["response"] == new_best:
                        item["selected"] = True
                        item["explanation"] = explanation
                current_best = new_best
                
                if verbose:
                    print(f"\n    ✓ Selected alternative: {explanation}")
            else:
                for item in thinking_history:
                    if item["selected"] and item["response"] == current_best:
                        item["explanation"] = explanation
                        break
                
                if verbose:
                    print(f"\n    ✓ Kept current response: {explanation}")
        
        # Add to conversation history
        self.conversation_history.append({"role": "user", "content": user_input})
        self.conversation_history.append({"role": "assistant", "content": current_best})
        
        # Keep conversation history manageable
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
        
        print("\n" + "=" * 50)
        print("🎯 FINAL RESPONSE SELECTED")
        print("=" * 50)
        
        return {
            "response": current_best,
            "thinking_rounds": thinking_rounds,
            "thinking_history": thinking_history
        }
    
    def save_full_log(self, filename: str = None):
        """Save the full thinking process log."""
        if filename is None:
            filename = f"full_thinking_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                "conversation": self.conversation_history,
                "full_thinking_log": self.full_thinking_log,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)
        
        print(f"Full thinking log saved to {filename}")
    
    def save_conversation(self, filename: str = None):
        """Save the conversation and thinking history."""
        if filename is None:
            filename = f"chat_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                "conversation": self.conversation_history,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)
        
        print(f"Conversation saved to {filename}")

def main():
    print("🤖 Enhanced Recursive Thinking Chat")
    print("=" * 50)
    
    # Get API key
    api_key = input("Enter your OpenRouter API key (or press Enter to use env variable): ").strip()
    if not api_key:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            print("Error: No API key provided and OPENROUTER_API_KEY not found in environment")
            return
    
    # Initialize chat
    chat = EnhancedRecursiveThinkingChat(api_key=api_key)
    
    print("\nChat initialized! Type 'exit' to quit, 'save' to save conversation.")
    print("The AI will think recursively before each response.\n")
    
    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() == 'exit':
            break
        elif user_input.lower() == 'save':
            chat.save_conversation()
            continue
        elif user_input.lower() == 'save full':
            chat.save_full_log()
            continue
        elif not user_input:
            continue
        
        # Get response with thinking process
        result = chat.think_and_respond(user_input)
        
        print(f"\n🤖 AI FINAL RESPONSE: {result['response']}\n")
        
        # Always show complete thinking process
        print("\n--- COMPLETE THINKING PROCESS ---")
        for item in result['thinking_history']:
            print(f"\nRound {item['round']} {'[SELECTED]' if item['selected'] else '[ALTERNATIVE]'}:")
            print(f"  Response: {item['response']}")
            if 'explanation' in item and item['selected']:
                print(f"  Reason for selection: {item['explanation']}")
            print("-" * 50)
        print("--------------------------------\n")
    
    # Save on exit
    save_on_exit = input("Save conversation before exiting? (y/n): ").strip().lower()
    if save_on_exit == 'y':
        chat.save_conversation()
        save_full = input("Save full thinking log? (y/n): ").strip().lower()
        if save_full == 'y':
            chat.save_full_log()
    
    print("Goodbye! 👋")

if __name__ == "__main__":
    main()
