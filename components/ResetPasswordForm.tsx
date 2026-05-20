import React, { useState } from 'react';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../src/services/supabase';

interface ResetPasswordFormProps {
  onComplete: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      onComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar senha.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-vybe-card border border-gray-800 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="text-vybe-accent" size={24} />
          <h1 className="text-xl font-bold text-white">Nova senha</h1>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Defina uma nova senha para acessar o Vybe Finanças.
        </p>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            {error}
          </p>
        )}

        <label className="block text-xs text-vybe-muted mb-1 font-medium">Nova senha</label>
        <div className="relative mb-4">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 pl-9 text-white focus:outline-none focus:border-vybe-accent"
            required
            minLength={6}
          />
        </div>

        <label className="block text-xs text-vybe-muted mb-1 font-medium">Confirmar senha</label>
        <div className="relative mb-6">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 pl-9 text-white focus:outline-none focus:border-vybe-accent"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-vybe-accent hover:bg-[#E65C00] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
