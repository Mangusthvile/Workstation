import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startDesktopBridge } from './desktopBridge';

startDesktopBridge();
createRoot(document.getElementById('root')!).render(<App />);
