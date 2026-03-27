import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

// 1. Define your classes (MUST match the alphabetical order from Python)
const FOOD_CLASSES = ['dosa', 'pineapple', 'pomegranate'];

export default function App() {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [predictionText, setPredictionText] = useState("Initializing AI...");

  // 2. Load your custom Edge AI brain from the assets folder
  const objectDetection = useTensorflowModel(require('./assets/flow_mode_vision.tflite'));
  const model = objectDetection.state === 'loaded' ? objectDetection.model : null;

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // JS function to update the UI safely from the background thread
  const updateUI = (text) => {
    setPredictionText(text);
  };

  // 3. The Real-Time Frame Processor (Runs continuously in the background)
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (model == null) return;

    try {
      // Pass the live camera frame to the AI model
      // Note: fast-tflite auto-converts the frame to a tensor
      const outputs = model.runSync([frame]);
      
      // The output is an array of probabilities [dosa%, pineapple%, pomegranate%]
      const probabilities = outputs[0]; 
      
      // Find the highest probability (ArgMax)
      let maxIndex = 0;
      let maxValue = probabilities[0];
      for (let i = 1; i < probabilities.length; i++) {
        if (probabilities[i] > maxValue) {
          maxValue = probabilities[i];
          maxIndex = i;
        }
      }

      // If the AI is more than 70% confident, update the screen
      if (maxValue > 0.70) {
        const result = `${FOOD_CLASSES[maxIndex]} (${(maxValue * 100).toFixed(0)}%)`;
        runOnJS(updateUI)(result);
      } else {
        runOnJS(updateUI)("Scanning...");
      }

    } catch (e) {
      console.log("AI Processing Error: ", e);
    }
  }, [model]);

  if (!hasPermission) return <SafeAreaView style={styles.container}><Text>Please grant camera permissions.</Text></SafeAreaView>;
  if (device == null) return <SafeAreaView style={styles.container}><Text>No camera found.</Text></SafeAreaView>;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="rgb"
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>{predictionText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#14b8a6', // The teal accent from your UI design
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});