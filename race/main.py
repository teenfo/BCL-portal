from fastapi import FastAPI, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
from supabase import create_client, Client

app = FastAPI(title="BCL Race Server")

# Supabase Setup (using env vars from docker-compose/env_file)
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def persist_race_result(lane_data):
    """Background task to save race results to Supabase"""
    if supabase:
        try:
            # Table: race_results (assumed)
            supabase.table("race_results").insert({
                "member_name": lane_data["name"],
                "distance": lane_data["distance"],
                "speed": lane_data["speed"],
                "timestamp": "now()"
            }).execute()
            print(f"Persisted result for {lane_data['name']}")
        except Exception as e:
            print(f"Failed to persist result: {e}")

@app.get("/")
async def root():
    return {"message": "BCL Race Server is running", "status": "healthy", "supabase_connected": supabase is not None}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.websocket("/ws/race")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Simulate real-time leaderboard data
            data = {
                "type": "leaderboard",
                "data": [
                    {"lane": 1, "name": "Player A", "distance": 120, "speed": 12.5},
                    {"lane": 2, "name": "Player B", "distance": 115, "speed": 11.8},
                ]
            }
            await websocket.send_text(json.dumps(data))
            
            # Example: If race finishes, trigger background persistence
            # if finish_condition:
            #     background_tasks.add_task(persist_race_result, data["data"][0])
            
            await asyncio.sleep(0.5)
    except Exception as e:
        print(f"WebSocket closed: {e}")
    finally:
        await websocket.close()
