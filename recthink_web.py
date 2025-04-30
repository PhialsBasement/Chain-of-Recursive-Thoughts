from fastapi import FastAPI, WebSocket, HTTPException, Depends, Request, WebSocketDisconnect
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import os
import asyncio
from datetime import datetime
from typing import List, Dict, Optional, Any
import logging

# Import the main RecThink class
from recursive_thinking_ai import EnhancedRecursiveThinkingChat

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RecThink API", description="API for Enhanced Recursive Thinking Chat")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a dictionary to store chat instances
chat_instances = {}

# Pydantic models for request/response validation
class ChatConfig(BaseModel):
    api_key: str
    model: str = "mistralai/mistral-small-3.1-24b-instruct:free"

class MessageRequest(BaseModel):
    session_id: str
    message: str
    thinking_rounds: Optional[int] = None
    alternatives_per_round: Optional[int] = 3

class SaveRequest(BaseModel):
    session_id: str
    filename: Optional[str] = None
    full_log: bool = False

@app.post("/api/initialize")
async def initialize_chat(config: ChatConfig):
    """Initialize a new chat session"""
    try:
        # Generate a session ID
        session_id = f"session_{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}"
        
        # Initialize the chat instance
        chat = EnhancedRecursiveThinkingChat(api_key=config.api_key, model=config.model)
        chat_instances[session_id] = chat
        
        return {"session_id": session_id, "status": "initialized"}
    except Exception as e:
        logger.error(f"Error initializing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize chat: {str(e)}")

@app.post("/api/send_message")
async def send_message(request: MessageRequest):
    """Send a message and get a response with thinking process"""
    try:
        if request.session_id not in chat_instances:
            raise HTTPException(status_code=404, detail="Session not found")
        
        chat = chat_instances[request.session_id]
        
        # Override class parameters if provided
        original_thinking_fn = chat._determine_thinking_rounds
        original_alternatives_fn = chat._generate_alternatives
        
        if request.thinking_rounds is not None:
            # Override the thinking rounds determination
            chat._determine_thinking_rounds = lambda _: request.thinking_rounds
        
        if request.alternatives_per_round is not None:
            # Store the original function
            def modified_generate_alternatives(base_response, prompt, num_alternatives=3):
                return original_alternatives_fn(base_response, prompt, request.alternatives_per_round)
            
            chat._generate_alternatives = modified_generate_alternatives
        
        # Process the message
        result = chat.think_and_respond(request.message, verbose=True)
        
        # Restore original functions
        chat._determine_thinking_rounds = original_thinking_fn
        chat._generate_alternatives = original_alternatives_fn
        
        return {
            "session_id": request.session_id,
            "response": result["response"],
            "thinking_rounds": result["thinking_rounds"],
            "thinking_history": result["thinking_history"]
        }
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@app.post("/api/save")
async def save_conversation(request: SaveRequest):
    """Save the conversation or full thinking log"""
    try:
        if request.session_id not in chat_instances:
            raise HTTPException(status_code=404, detail="Session not found")
        
        chat = chat_instances[request.session_id]
        
        filename = request.filename
        if request.full_log:
            chat.save_full_log(filename)
        else:
            chat.save_conversation(filename)
        
        return {"status": "saved", "filename": filename}
    except Exception as e:
        logger.error(f"Error saving conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save conversation: {str(e)}")

@app.get("/api/sessions")
async def list_sessions():
    """List all active chat sessions"""
    sessions = []
    for session_id, chat in chat_instances.items():
        sessions.append({
            "session_id": session_id,
            "message_count": len(chat.conversation_history) // 2,  # Each message-response pair counts as 2
            "created_at": session_id.split("_")[1]  # Extract timestamp from session ID
        })
    
    return {"sessions": sessions}

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    if session_id not in chat_instances:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del chat_instances[session_id]
    return {"status": "deleted", "session_id": session_id}

# WebSocket for streaming thinking process
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    if session_id not in chat_instances:
        await websocket.send_json({"error": "Session not found"})
        await websocket.close()
        return
    
    chat = chat_instances[session_id]
    
    try:
        # Set up a custom callback to stream thinking process
        original_call_api = chat._call_api
        
        async def stream_callback(chunk):
            await websocket.send_json({"type": "chunk", "content": chunk})
        
        # Override the _call_api method to also send updates via WebSocket
        def ws_call_api(messages, temperature=0.7, stream=True):
            result = original_call_api(messages, temperature, stream)
            # Send the chunk via WebSocket if we're streaming
            if stream:
                asyncio.create_task(stream_callback(result))
            return result
        
        # Replace the method temporarily
        chat._call_api = ws_call_api
        
        # Wait for messages from the client
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data["type"] == "message":
                # Process the message
                result = chat.think_and_respond(message_data["content"], verbose=True)
                
                # Send the final result
                await websocket.send_json({
                    "type": "final",
                    "response": result["response"],
                    "thinking_rounds": result["thinking_rounds"],
                    "thinking_history": result["thinking_history"]
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.send_json({"error": str(e)})
    finally:
        # Restore original method
        chat._call_api = original_call_api

# Serve the React app
@app.get("/")
async def root():
    return {"message": "RecThink API is running. Frontend available at http://localhost:3000"}

if __name__ == "__main__":
    uvicorn.run("recthink_web:app", host="0.0.0.0", port=8000, reload=True)
