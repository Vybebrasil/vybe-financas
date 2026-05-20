import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase, supabaseUrl } from '../src/services/supabase'; // Importação do serviço real

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // Feedback para checar email
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Nome da Empresa

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        // --- RECUPERAÇÃO DE SENHA ---
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) throw resetError;
        setSuccessMessage('Se o e-mail existir, um link de recuperação foi enviado.');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        // --- CADASTRO NO SUPABASE ---
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_name: name, // Salva o nome da empresa nos metadados do usuário
            },
          },
        });

        if (signUpError) throw signUpError;

        setSuccessMessage('Conta criada com sucesso! Verifique seu email para confirmar o cadastro antes de entrar.');
        setIsSignUp(false); // Volta para a tela de login
      } else {
        // --- LOGIN NO SUPABASE ---
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Sucesso: O App.tsx vai detectar a sessão automaticamente via onAuthStateChange
        onLogin();
      }
    } catch (err: any) {
      // Tradução simples de erros comuns
      let msg = err.message;
      if (msg.includes('Invalid login credentials')) msg = 'Email ou senha incorretos.';
      if (msg.includes('User already registered')) msg = 'Este email já está cadastrado.';
      if (msg === 'TypeError: Failed to fetch' || msg === 'Failed to fetch') {
        msg = `Erro de conexão (Failed to fetch). Verifique se a URL do Supabase é válida e acessível. URL configurada: "${supabaseUrl || 'Não definida'}". Se estiver apontando para localhost, você precisa configurar a URL real do seu projeto Supabase no painel da Vercel (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (isForgotPassword) {
      setIsForgotPassword(false);
    } else {
      setIsSignUp(!isSignUp);
    }
    setError('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorativo (Glows) */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-vybe-accent/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#1E1E1E] border border-gray-800 rounded-2xl shadow-2xl p-8 relative z-10 animate-bar-grow origin-center">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-vybe-accent to-orange-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-900/40 mx-auto mb-4">
            <span className="font-bold text-2xl">V</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isForgotPassword ? 'Recuperar Senha' : isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-sm text-gray-500">
            {isForgotPassword ? 'Enviaremos um link para redefinir sua senha.' : isSignUp ? 'Comece a controlar suas finanças hoje.' : 'Acesse o painel da Vybe Finanças.'}
          </p>
        </div>

        {/* Mensagens de Feedback */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-red-500 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-3 text-green-500 text-sm">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nome (Apenas Sign Up) */}
          {isSignUp && !isForgotPassword && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 ml-1">Nome da Empresa</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sua Agência"
                  required
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-[#121212] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all"
              />
            </div>
          </div>

          {/* Password */}
          {!isForgotPassword && (
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-medium text-gray-400">Senha</label>
                  {!isSignUp && (
                      <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }} className="text-[10px] text-vybe-accent hover:text-white transition-colors">Esqueceu a senha?</button>
                  )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-vybe-accent focus:ring-1 focus:ring-vybe-accent transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-vybe-accent hover:bg-[#E65C00] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/20 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isForgotPassword ? 'Enviar Link' : isSignUp ? 'Criar Conta Grátis' : 'Entrar na Plataforma'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer / Toggle */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-400">
            {isForgotPassword ? 'Lembrou sua senha?' : isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
            <button 
              onClick={toggleMode}
              type="button"
              className="text-white font-bold ml-1 hover:underline focus:outline-none"
            >
              {isForgotPassword ? 'Voltar ao Login' : isSignUp ? 'Fazer Login' : 'Cadastre-se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;