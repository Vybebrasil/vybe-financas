import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Login from './components/Login';
import ResetPasswordForm from './components/ResetPasswordForm';
import AppShell from './components/AppShell';
import { AppDataProvider } from './src/context/AppDataContext';
import { supabase, isSupabaseConfigured } from './src/services/supabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsAuthLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordReset(true);
      }
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#FF6600]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-2xl bg-[#1E1E1E] border border-gray-800 rounded-2xl shadow-2xl p-8 relative z-10 animate-bar-grow origin-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6600] to-orange-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-950/40">
              <span className="font-bold text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Vybe <span className="text-[#FF6600]">Finanças</span>
              </h1>
              <p className="text-xs text-gray-400">Portal de Configuração & Diagnóstico</p>
            </div>
          </div>

          <div className="bg-orange-950/20 border border-orange-800/30 rounded-xl p-5 mb-6">
            <h2 className="text-base font-semibold text-orange-400 flex items-center gap-2 mb-2">
              Supabase não configurado ou com valores padrão
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Crie o arquivo <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded font-mono text-orange-300">.env.local</code> na raiz com{' '}
              <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded font-mono text-orange-300">VITE_SUPABASE_URL</code> e{' '}
              <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded font-mono text-orange-300">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full px-5 py-2.5 bg-gradient-to-r from-[#FF6600] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all shadow-md active:scale-95"
          >
            Recarregar Aplicativo
          </button>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin text-vybe-accent" size={48} />
        <p className="text-sm text-gray-400">Carregando sistema...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => {}} />;
  }

  if (needsPasswordReset) {
    return (
      <ResetPasswordForm
        onComplete={() => {
          setNeedsPasswordReset(false);
        }}
      />
    );
  }

  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  );
};

export default App;
