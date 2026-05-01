from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import numpy as np
import joblib
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

#gited
ml = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ml["model"]  = joblib.load(os.path.join(base, "model", "random_forest.pkl"))
    ml["scaler"] = joblib.load(os.path.join(base, "model", "scaler.pkl"))
    print("✅ Model and scaler loaded.")
    yield
    ml.clear()

app = FastAPI(
    title="Credit Card Fraud Detection API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

@app.get("/")
async def read_index():
    return FileResponse("frontend/index.html")

class TransactionInput(BaseModel):
    Time: float
    V1: float;  V2: float;  V3: float;  V4: float
    V5: float;  V6: float;  V7: float;  V8: float
    V9: float;  V10: float; V11: float; V12: float
    V13: float; V14: float; V15: float; V16: float
    V17: float; V18: float; V19: float; V20: float
    V21: float; V22: float; V23: float; V24: float
    V25: float; V26: float; V27: float; V28: float
    Amount: float

class PredictionResult(BaseModel):
    prediction: int
    label: str
    fraud_probability: float
    normal_probability: float



@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Fraud Detection API is running."}

@app.post("/predict", response_model=PredictionResult, tags=["Prediction"])
def predict(transaction: TransactionInput):
    try:
        data = transaction.model_dump()
        time_amount_scaled = ml["scaler"].transform([[data["Time"], data["Amount"]]])

        features = np.array([[
            time_amount_scaled[0][0],
            data["V1"],  data["V2"],  data["V3"],  data["V4"],
            data["V5"],  data["V6"],  data["V7"],  data["V8"],
            data["V9"],  data["V10"], data["V11"], data["V12"],
            data["V13"], data["V14"], data["V15"], data["V16"],
            data["V17"], data["V18"], data["V19"], data["V20"],
            data["V21"], data["V22"], data["V23"], data["V24"],
            data["V25"], data["V26"], data["V27"], data["V28"],
            time_amount_scaled[0][1],
        ]])

        prediction = int(ml["model"].predict(features)[0])
        probabilities = ml["model"].predict_proba(features)[0]

        return PredictionResult(
            prediction=prediction,
            label="Fraud" if prediction == 1 else "Normal",
            fraud_probability=round(float(probabilities[1]), 4),
            normal_probability=round(float(probabilities[0]), 4),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))