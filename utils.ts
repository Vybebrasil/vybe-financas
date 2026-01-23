import { Transaction, TransactionType, Client, ChartDataPoint, ChartPeriod } from './types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate() + 1).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const generateWhatsAppLink = (client: Client): string => {
  const phone = client.phone.replace(/\D/g, ''); // Remove non-numeric chars
  const message = `Olá ${client.contactPerson}, tudo bem? 

Aqui é da Agência. Estamos enviando o lembrete da fatura referente ao serviço: *${client.activePlan}*.

💰 *Valor:* ${formatCurrency(client.monthlyFee)}
📅 *Vencimento:* Dia ${client.dueDay}

Qualquer dúvida, estou à disposição!`;

  return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
};

export const getChartData = (transactions: Transaction[], period: ChartPeriod, targetYear: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const today = new Date();

  if (period === 'daily') {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dateKey = `${d.getFullYear()}-${monthStr}-${dayStr}`; // YYYY-MM-DD
      
      data.push({
        label: `${dayStr}/${monthStr}`,
        key: dateKey,
        income: 0,
        expense: 0
      });
    }

    transactions.forEach(t => {
      const point = data.find(p => p.key === t.date); // t.date is YYYY-MM-DD
      if (point) {
        if (t.type === TransactionType.INCOME) point.income += t.amount;
        else point.expense += t.amount;
      }
    });

  } else if (period === 'monthly') {
    // Show Jan to Dec for the selected targetYear
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 0; i < 12; i++) {
      const monthStr = String(i + 1).padStart(2, '0');
      const key = `${targetYear}-${monthStr}`; // Format: YYYY-MM

      data.push({
        label: monthNames[i],
        key: key,
        income: 0,
        expense: 0
      });
    }

    transactions.forEach(t => {
      // t.date format is YYYY-MM-DD
      const tYear = parseInt(t.date.split('-')[0]);
      const tMonth = t.date.substring(0, 7); // YYYY-MM

      // Filter primarily by the key (YYYY-MM)
      const point = data.find(p => p.key === tMonth);
      
      if (point && tYear === targetYear) {
        if (t.type === TransactionType.INCOME) point.income += t.amount;
        else point.expense += t.amount;
      }
    });

  } else if (period === 'yearly') {
    // Dynamic years based on transactions
    const years = new Set<string>();
    const currentYear = String(today.getFullYear());
    years.add(currentYear);
    
    transactions.forEach(t => years.add(t.date.substring(0, 4)));
    
    const sortedYears = Array.from(years).sort();

    sortedYears.forEach(year => {
      data.push({
        label: year,
        key: year,
        income: 0,
        expense: 0
      });
    });

    transactions.forEach(t => {
      const tYear = t.date.substring(0, 4);
      const point = data.find(p => p.key === tYear);
      if (point) {
        if (t.type === TransactionType.INCOME) point.income += t.amount;
        else point.expense += t.amount;
      }
    });

  } else if (period === 'total') {
    // Single Total Bar
    const totalPoint = {
      label: 'Total Geral',
      key: 'total',
      income: 0,
      expense: 0
    };

    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) totalPoint.income += t.amount;
      else totalPoint.expense += t.amount;
    });

    data.push(totalPoint);
  }

  return data;
};