

// import React, { useState, useRef, useEffect } from 'react';
// import { saveToIndexedDB, getAllRecordings, deleteRecording } from './db';

// const App = () => {
//   const videoRef = useRef(null);
//   const mediaRecorderRef = useRef(null);
//   const chunksRef = useRef([]);
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordings, setRecordings] = useState([]);
//   const [transcript, setTranscript] = useState('');
//   const recognitionRef = useRef(null);

//   useEffect(() => {
//     getAllRecordings().then(setRecordings);
//   }, []);

//   useEffect(() => {
//     navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
//       videoRef.current.srcObject = stream;
//     });
//   }, []);

//   const startRecording = () => {
//     setTranscript('');
//     const stream = videoRef.current.srcObject;
//     mediaRecorderRef.current = new MediaRecorder(stream);
//     chunksRef.current = [];
//     mediaRecorderRef.current.ondataavailable = e => chunksRef.current.push(e.data);
//     mediaRecorderRef.current.start();
//     setIsRecording(true);

//     if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
//       const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//       const recognition = new SpeechRecognition();
//       recognition.lang = 'en-US';
//       recognition.continuous = true;
//       recognition.interimResults = false;
//       recognition.onresult = event => {
//         const finalTranscript = Array.from(event.results)
//           .map(result => result[0].transcript)
//           .join('');
//         setTranscript(prev => prev + ' ' + finalTranscript);
//       };
//       recognition.start();
//       recognitionRef.current = recognition;
//     }
//   };

//   const stopRecording = async () => {
//     mediaRecorderRef.current.stop();
//     setIsRecording(false);
//     if (recognitionRef.current) {
//       recognitionRef.current.stop();
//     }

//     mediaRecorderRef.current.onstop = async () => {
//       const blob = new Blob(chunksRef.current, { type: 'video/webm' });
//       const name = `Recording_${Date.now()}`;
//       await saveToIndexedDB(name, blob, transcript.trim());
//       const updated = await getAllRecordings();
//       setRecordings(updated);
//     };
//   };

//   const handleDelete = async (id) => {
//     await deleteRecording(id);
//     const updated = await getAllRecordings();
//     setRecordings(updated);
//   };

//   return (
//     <div>
//       <h1>Offline Recording App</h1>
//       <video ref={videoRef} autoPlay muted width="400" />
//       <div>
//         <button onClick={isRecording ? stopRecording : startRecording}>
//           {isRecording ? 'Stop Recording' : 'Start Recording'}
//         </button>
//       </div>
//       <h2>Saved Recordings</h2>
//       {recordings.map(rec => (
//         <div key={rec.id}>
//           <video controls src={URL.createObjectURL(rec.blob)} width="300" />
//           <p><strong>Transcript:</strong> {rec.transcript}</p>
//           <button onClick={() => handleDelete(rec.id)}>Delete</button>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default App;

import React, { useState, useRef, useEffect } from 'react';
import { saveToIndexedDB, getAllRecordings, deleteRecording } from './db';

const App = () => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [transcript, setTranscript] = useState('');

  // Load saved recordings on mount
  useEffect(() => {
    getAllRecordings().then(setRecordings);
  }, []);

  // Setup media stream on mount
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        sampleRate: 16000,
        channelCount: 1,
      },
    }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).catch(err => {
      console.error('Error accessing media devices.', err);
    });
  }, []);

  // Keep ref synced with state for recognition lifecycle
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    setTranscript('');
    const stream = videoRef.current.srcObject;
    if (!stream) {
      alert('No media stream available');
      return;
    }

    // Setup MediaRecorder with chunking every 30 seconds (optional)
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      audioBitsPerSecond: 128000,
    });

    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.start(30000); // Emit data every 30 seconds

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const name = `Recording_${Date.now()}`;
      await saveToIndexedDB(name, blob, transcript.trim());
      const updated = await getAllRecordings();
      setRecordings(updated);
    };

    setIsRecording(true);

    // Setup speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = event => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk + ' ';
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => (prev + ' ' + finalTranscript).trim());
        }
        // Optionally, you can show interim transcript live if you want
        // setTranscript(prev => (prev + ' ' + interimTranscript).trim());
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          recognition.start(); // Auto-restart recognition if still recording
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        // Optionally handle errors here (e.g., restart recognition)
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleDelete = async (id) => {
    await deleteRecording(id);
    const updated = await getAllRecordings();
    setRecordings(updated);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Offline Recording App</h1>
      <video ref={videoRef} autoPlay muted width="400" style={{ border: '1px solid #ccc' }} />
      <div style={{ margin: '10px 0' }}>
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      <h2>Transcript</h2>
      <div style={{
        minHeight: 100,
        padding: 10,
        border: '1px solid #ddd',
        backgroundColor: '#f9f9f9',
        whiteSpace: 'pre-wrap'
      }}>
        {transcript || <i>No transcript yet</i>}
      </div>
      <h2>Saved Recordings</h2>
      {recordings.length === 0 && <p>No recordings saved.</p>}
      {recordings.map(rec => (
        <div key={rec.id} style={{ marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
          <video controls src={URL.createObjectURL(rec.blob)} width="300" />
          <p><strong>Transcript:</strong> {rec.transcript || <i>No transcript</i>}</p>
          <button onClick={() => handleDelete(rec.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};

export default App;
