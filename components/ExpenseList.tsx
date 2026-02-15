
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Fixing FixedSizeList import error by using star import to avoid missing named export issues
import * as ReactWindow from 'react-window';
// Fixing AutoSizer default import issue which often causes SyntaxError in ESM environments
import * as AutoSizerModule from 'react-virtualized-auto-sizer';
import { Expense } from '../types';
import { getExpenses, deleteExpense as deleteExpenseDb } from '../services/dataService';

// Bypassing JSX signature errors and missing default export errors by casting and checking both default and named exports
const List = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList;
const AutoSizer = (AutoSizerModule as any).default || (AutoSizerModule as any).AutoSizer || AutoSizerModule;
const AutoSizerComponent = AutoSizer as any;

interface ExpenseListProps {
  onEdit?: (expense: Expense) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const ExpenseList: React.FC<ExpenseListProps> = ({ onEdit }) => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data || []);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const now = new Date();
    if (dateStr === 'Hoje') return now.getTime();
    if (dateStr === 'Ontem') return now.getTime() - 86400000;
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.getTime();
    return 0;
  };

  const isOverduePending = (exp: Expense) => {
    if (exp.status !== 'Pendente') return false;
    const expenseTime = parseDate(exp.date);
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    return (Date.now() - expenseTime) > threeDaysInMs;
  };

  const handleRemindManager = useCallback((e: React.MouseEvent, exp: Expense) => {
    e.stopPropagation();
    setReminderToast(`Lembrete enviado ao gestor sobre a despesa em ${exp.merchant}!`);
    setTimeout(() => setReminderToast(null), 4000);
  }, []);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      switch (sortOption) {
        case 'date-desc': return parseDate(b.date) - parseDate(a.date);
        case 'date-asc': return parseDate(a.date) - parseDate(b.date);
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        default: return 0;
      }
    });
  }, [expenses, sortOption]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation();
    setExpenseToDelete(expense);
  }, []);

  const confirmDelete = async () => {
    if (expenseToDelete) {
      try {
        await deleteExpenseDb(expenseToDelete.id);
        setExpenses(prev => prev.filter(exp => exp.id !== expenseToDelete.id));
        setExpenseToDelete(null);
      } catch (error) {
        alert("Erro ao excluir despesa.");
      }
    }
  };

  const getStatusStyles = (status: Expense['status']) => {
    switch (status) {
      case 'Aprovado': 
        return 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-50';
      case 'Pendente': 
        return 'bg-yellow-50 text-yellow-600 border-yellow-200 shadow-sm shadow-yellow-50';
      case 'Rejeitado': 
        return 'bg-red-50 text-red-600 border-red-200 shadow-sm shadow-red-50';
      default: 
        return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getStatusIcon = (status: Expense['status']) => {
    switch (status) {
      case 'Aprovado': return 'fa-circle-check';
      case 'Pendente': return 'fa-clock';
      case 'Rejeitado': return 'fa-circle-xmark';
      default: return 'fa-circle-question';
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const sortLabels: Record<SortOption, string> = {
    'date-desc': 'Mais recentes primeiro',
    'date-asc': 'Mais antigas primeiro',
    'amount-desc': 'Maior valor',
    'amount-asc': 'Menor valor'
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const exp = sortedExpenses[index];
    return (
      <div style={style}>
        <div 
          onClick={() => onEdit?.(exp)}
          className={`h-full p-5 flex items-center gap-4 hover:bg-emerald-50/30 transition-colors cursor-pointer group border-b border-gray-50`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform shadow-inner shrink-0">
            {exp.category === 'Transporte' && <i className="fa-solid fa-car"></i>}
            {exp.category === 'Alimentação' && <i className="fa-solid fa-utensils"></i>}
            {exp.category === 'Hospedagem' && <i className="fa-solid fa-bed"></i>}
            {exp.category !== 'Transporte' && exp.category !== 'Alimentação' && exp.category !== 'Hospedagem' && <i className="fa-solid fa-file-invoice-dollar"></i>}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 truncate text-base group-hover:text-emerald-700 transition-colors tracking-tight">{exp.merchant}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{formatDateLabel(exp.date)}</span>
              <span className="text-slate-200 text-[10px]">•</span>
              <div className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${getStatusStyles(exp.status)} transition-all`}>
                <i className={`fa-solid ${getStatusIcon(exp.status)}`}></i>
                {exp.status}
              </div>
              {isOverduePending(exp) && (
                <button 
                  onClick={(e) => handleRemindManager(e, exp)}
                  className="ml-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  <i className="fa-solid fa-bell-concierge animate-bounce"></i>
                  Cobrar
                </button>
              )}
            </div>
          </div>
          <div className="text-right flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end gap-1">
              <p className="font-black text-gray-900 text-lg tracking-tight">R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <button 
              onClick={(e) => handleDeleteClick(e, exp)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
            <i className="fa-solid fa-chevron-right text-gray-200 text-[10px] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all"></i>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100 shrink-0">
        <h3 className="text-slate-900 font-black text-lg tracking-tight italic">Minhas Despesas</h3>
        <div className="relative">
          <button 
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
          >
            <i className="fa-solid fa-sort"></i>
            {sortLabels[sortOption]}
          </button>
          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-50 z-50 overflow-hidden py-2">
              {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSortOption(key); setShowSortMenu(false); }}
                  className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${sortOption === key ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl text-emerald-100"></i>
          </div>
        ) : sortedExpenses.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-4">
             <i className="fa-solid fa-receipt text-6xl opacity-20"></i>
             <p className="font-bold italic">Nenhuma despesa encontrada.</p>
          </div>
        ) : (
          <AutoSizerComponent>
            {({ height, width }: { height: number; width: number }) => (
              <List
                height={height}
                itemCount={sortedExpenses.length}
                itemSize={90}
                width={width}
              >
                {Row}
              </List>
            )}
          </AutoSizerComponent>
        )}
      </div>

      {reminderToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <i className="fa-solid fa-circle-check text-emerald-400 mr-2"></i>
          {reminderToast}
        </div>
      )}

      {expenseToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 space-y-8 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir Lançamento?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Esta ação não pode ser desfeita. Deseja realmente excluir esta despesa?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-5 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-red-700 transition-all">Excluir Agora</button>
              <button onClick={() => setExpenseToDelete(null)} className="w-full py-5 bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
