# 🔒 Smart Surveillance System  

![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Object%20Detection-orange?logo=ultralytics)
![Roboflow Dataset](https://img.shields.io/badge/Dataset-Roboflow-green?logo=roboflow)
![Status](https://img.shields.io/badge/Status-Active-success)

---

## 🧠 Overview  
**Smart Surveillance System** is a real-time AI-powered monitoring application built using **YOLOv8**.  
It can detect and alert for multiple emergency situations such as **fire**, **smoke**, and **accidents**, making CCTV surveillance systems proactive instead of reactive.  

---

## 🚀 Features  

- 🎥 **Real-time Video Analysis** — Runs object detection on live camera feeds or uploaded videos.  
- 🔥 **Fire Detection Module** — Accurately identifies fire incidents using a custom-trained YOLOv8 model.  
- ☁️ **Multi-class Emergency Detection** *(Upcoming)* — Extendable to detect smoke, accidents, and other hazards.  
- 🌐 **Web Dashboard** —  
  - Upload or stream video feeds  
  - View live detection results  
  - Visualize event logs & statistics  

---

## 🧩 Dataset  

For the **Fire Detection Module**, we used a custom dataset from **Roboflow Universe**:  

📂 **[Fire Dataset for YOLOv8 (by SmartCCTV AI)](https://universe.roboflow.com/smartcctvai/fire-dataset-for-yolov8-oyxcn)**  

- **Dataset Type:** Object Detection  
- **Format:** YOLOv8 (TXT + Images)  
- **Classes:** `fire`  
- **Source:** Curated fire imagery from diverse environments  

---

## 🏗️ Tech Stack  

| Component | Technology |
|------------|-------------|
| **Model** | YOLOv8 (Ultralytics) |
| **Language** | Python |
| **Backend / Web App** | Flask |
| **Computer Vision** | OpenCV |
| **Data Tools** | NumPy, Pandas |
| **Visualization** | Matplotlib, Roboflow |

---

## ⚙️ Installation & Setup  

1. **Clone the repository:**  
    ```bash
    git clone https://github.com/<your-username>/smart-surveillance-system.git
    cd smart-surveillance-system
    ```
    Create virtual environment.

2. **Install dependencies:**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

3. **Run the application:**
    ```bash
    python app.py
    ```

---

## 🪪 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.