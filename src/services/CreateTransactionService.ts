import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CategoriesRepository from '../repositories/CategoriesRepository';
import CreateCategoryService from './CreateCategoryService';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getCustomRepository(CategoriesRepository);

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('The outcome value is bigger than the total balance');
    }

    const findCategory = await categoriesRepository.findByTitle(category);
    let newCategory = {} as Category;

    if (!findCategory) {
      const createCategory = new CreateCategoryService();
      newCategory = await createCategory.execute(category);
    }

    const category_id = findCategory ? findCategory?.id : newCategory.id;

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id,
    });

    transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
