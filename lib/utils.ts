export const formatCurrency = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const CURRENCY_COMPACT = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL', 
    notation: 'compact' 
});

export const CURRENCY_FULL = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
});

export const formatDate = (date: string | Date) => {
    if (!date) return 'N/I';
    return new Date(date).toLocaleDateString('pt-BR');
};

export const calculateSla = (deadline: string) => {
    const end = new Date(deadline);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};
