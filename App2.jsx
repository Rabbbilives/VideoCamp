

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

// import React, { useState, useRef, useEffect } from 'react';
// import { saveToIndexedDB, getAllRecordings, deleteRecording } from './db';

// const App = () => {
//   const videoRef = useRef(null);
//   const mediaRecorderRef = useRef(null);
//   const chunksRef = useRef([]);
//   const recognitionRef = useRef(null);
//   const isRecordingRef = useRef(false);

//   const [isRecording, setIsRecording] = useState(false);
//   const [recordings, setRecordings] = useState([]);
//   const [transcript, setTranscript] = useState('');

//   // Load saved recordings on mount
//   useEffect(() => {
//     getAllRecordings().then(setRecordings);
//   }, []);

//   // Setup media stream on mount
//   useEffect(() => {
//     navigator.mediaDevices.getUserMedia({
//       video: true,
//       audio: {
//         sampleRate: 16000,
//         channelCount: 1,
//       },
//     }).then(stream => {
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//       }
//     }).catch(err => {
//       console.error('Error accessing media devices.', err);
//     });
//   }, []);

//   // Keep ref synced with state for recognition lifecycle
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (recognitionRef.current) {
//         recognitionRef.current.stop();
//         recognitionRef.current = null;
//       }
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
//         mediaRecorderRef.current.stop();
//       }
//     };
//   }, []);

//   const startRecording = () => {
//     setTranscript('');
//     const stream = videoRef.current.srcObject;
//     if (!stream) {
//       alert('No media stream available');
//       return;
//     }

//     // Setup MediaRecorder with chunking every 30 seconds (optional)
//     mediaRecorderRef.current = new MediaRecorder(stream, {
//       mimeType: 'video/webm;codecs=vp9',
//       audioBitsPerSecond: 128000,
//     });

//     chunksRef.current = [];
//     mediaRecorderRef.current.ondataavailable = e => {
//       if (e.data && e.data.size > 0) {
//         chunksRef.current.push(e.data);
//       }
//     };

//     mediaRecorderRef.current.start(30000); // Emit data every 30 seconds

//     mediaRecorderRef.current.onstop = async () => {
//       const blob = new Blob(chunksRef.current, { type: 'video/webm' });
//       const name = `Recording_${Date.now()}`;
//       await saveToIndexedDB(name, blob, transcript.trim());
//       const updated = await getAllRecordings();
//       setRecordings(updated);
//     };

//     setIsRecording(true);

//     // Setup speech recognition
//     if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
//       const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//       const recognition = new SpeechRecognition();

//       recognition.lang = 'en-US';
//       recognition.continuous = true;
//       recognition.interimResults = true;
//       recognition.maxAlternatives = 1;

//       recognition.onresult = event => {
//         let interimTranscript = '';
//         let finalTranscript = '';

//         for (let i = event.resultIndex; i < event.results.length; ++i) {
//           const transcriptChunk = event.results[i][0].transcript;
//           if (event.results[i].isFinal) {
//             finalTranscript += transcriptChunk + ' ';
//           } else {
//             interimTranscript += transcriptChunk;
//           }
//         }

//         if (finalTranscript) {
//           setTranscript(prev => (prev + ' ' + finalTranscript).trim());
//         }
//         // Optionally, you can show interim transcript live if you want
//         // setTranscript(prev => (prev + ' ' + interimTranscript).trim());
//       };

//       recognition.onend = () => {
//         if (isRecordingRef.current) {
//           recognition.start(); // Auto-restart recognition if still recording
//         }
//       };

//       recognition.onerror = (event) => {
//         console.error('Speech recognition error', event.error);
//         // Optionally handle errors here (e.g., restart recognition)
//       };

//       recognition.start();
//       recognitionRef.current = recognition;
//     } else {
//       console.warn('Speech Recognition API not supported in this browser.');
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
//       mediaRecorderRef.current.stop();
//     }
//     setIsRecording(false);
//     if (recognitionRef.current) {
//       recognitionRef.current.stop();
//     }
//   };

//   const handleDelete = async (id) => {
//     await deleteRecording(id);
//     const updated = await getAllRecordings();
//     setRecordings(updated);
//   };

//   return (
//     <div style={{ padding: 20 }}>
//       <h1>Offline Recording App</h1>
//       <video ref={videoRef} autoPlay muted width="400" style={{ border: '1px solid #ccc' }} />
//       <div style={{ margin: '10px 0' }}>
//         <button onClick={isRecording ? stopRecording : startRecording}>
//           {isRecording ? 'Stop Recording' : 'Start Recording'}
//         </button>
//       </div>
//       <h2>Transcript</h2>
//       <div style={{
//         minHeight: 100,
//         padding: 10,
//         border: '1px solid #ddd',
//         backgroundColor: '#f9f9f9',
//         whiteSpace: 'pre-wrap'
//       }}>
//         {transcript || <i>No transcript yet</i>}
//       </div>
//       <h2>Saved Recordings</h2>
//       {recordings.length === 0 && <p>No recordings saved.</p>}
//       {recordings.map(rec => (
//         <div key={rec.id} style={{ marginBottom: 20, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
//           <video controls src={URL.createObjectURL(rec.blob)} width="300" />
//           <p><strong>Transcript:</strong> {rec.transcript || <i>No transcript</i>}</p>
//           <button onClick={() => handleDelete(rec.id)}>Delete</button>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default App;

import React, { useState, useRef, useEffect } from 'react';

const VideoRecorder = () => {
  const videoRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  // Setup camera and mic access
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support camera or microphone access.');
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        alert(`Error accessing camera or microphone: ${error.message}`);
      });
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Media devices not supported in this browser.');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    });

    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordings((prev) => [...prev, { blob, url }]);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
    startSpeechRecognition();
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition not supported. Try using Chrome on desktop.');
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult[0]) {
        setTranscript(lastResult[0].transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      alert(`Speech recognition failed: ${event.error}`);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended.');
    };

    recognition.start();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>🎥 Voice + Video Recorder</h2>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', maxWidth: '500px', borderRadius: '10px', border: '1px solid #ccc' }}
      />

      <div style={{ marginTop: '10px' }}>
        {!recording ? (
          <button onClick={startRecording} style={btnStyle}>
            🔴 Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} style={btnStyle}>
            ⏹️ Stop Recording
          </button>
        )}
      </div>

      <h3 style={{ marginTop: '20px' }}>📝 Transcript:</h3>
      <p style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
        {transcript || (speechSupported ? 'Waiting for speech...' : 'Speech recognition not supported')}
      </p>

      <h3 style={{ marginTop: '20px' }}>📁 Recordings:</h3>
      {recordings.length === 0 ? (
        <p>No recordings yet.</p>
      ) : (
        recordings.map((rec, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <video src={rec.url} controls style={{ width: '100%', maxWidth: '500px' }} />
            <a href={rec.url} download={`recording-${index + 1}.webm`} style={{ display: 'block', marginTop: '5px' }}>
              ⬇️ Download Recording
            </a>
          </div>
        ))
      )}
    </div>
  );
};

const btnStyle = {
  background: '#0070f3',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '6px',
  fontSize: '16px',
  cursor: 'pointer',
};

export default VideoRecorder;

