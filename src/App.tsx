import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ChatApp from './components/ChatApp';
import { isFirebaseConfigured } from './lib/firebase';
import { AlertCircle, Key } from 'lucide-react';

function ConfigWarning() {
  const currentOrigin = window.location.origin;
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 text-center overflow-y-auto max-h-[90vh] custom-scrollbar">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6 flex-shrink-0">
        <AlertCircle className="text-amber-600" size={32} />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Firebase Setup Required</h1>
      
      <div className="space-y-6 text-left w-full">
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
            Add Environment Variables
          </h2>
          <p className="text-gray-600 mb-3 text-sm">
            Add these to your project secrets in AI Studio:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg w-full font-mono text-xs space-y-1 border border-gray-200">
            <p>VITE_FIREBASE_API_KEY</p>
            <p>VITE_FIREBASE_AUTH_DOMAIN</p>
            <p>VITE_FIREBASE_PROJECT_ID</p>
            <p>VITE_FIREBASE_STORAGE_BUCKET</p>
            <p>VITE_FIREBASE_MESSAGING_SENDER_ID</p>
            <p>VITE_FIREBASE_APP_ID</p>
            <p>VITE_FIREBASE_DATABASE_URL</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
            Authorize Domains
          </h2>
          <p className="text-gray-600 mb-3 text-sm">
            Go to <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong> and add:
          </p>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 font-mono text-xs break-all">
            {currentOrigin}
          </div>
        </section>
      </div>

      <p className="mt-8 text-sm text-gray-500 italic">
        After adding these, refresh the page to start using Alapio.
      </p>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

  if (!isFirebaseConfigured) {
    return <ConfigWarning />;
  }

  return (
    <div className="h-screen w-full bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
      {user ? <ChatApp /> : <Login />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
