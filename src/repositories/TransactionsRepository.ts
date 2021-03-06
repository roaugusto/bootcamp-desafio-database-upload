import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const outcome = transactions
      .filter(item => item.type === 'outcome')
      .reduce((sum, item) => {
        return sum + Number(item.value);
      }, 0);

    const income = transactions
      .filter(item => item.type === 'income')
      .reduce<number>((sum, item) => {
        return sum + Number(item.value);
      }, 0);

    const total = income - outcome;

    const balance: Balance = {
      income,
      outcome,
      total,
    };

    return balance;
  }
}

export default TransactionsRepository;
