import { getCustomRepository, In } from 'typeorm';

import * as csv from 'fast-csv';
import path from 'path';
import fs from 'fs';
import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CategoriesRepository from '../repositories/CategoriesRepository';

interface TransactionFile {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getCustomRepository(CategoriesRepository);

    const transactions: TransactionFile[] = [];
    const categories: string[] = [];

    const fileCsvPath = path.join(uploadConfig.directory, filename);
    const stream = fs.createReadStream(fileCsvPath);
    const parsers = csv.parse({ headers: true, ltrim: true });
    const streamCsv = stream.pipe(parsers);

    streamCsv.on('data', (data: TransactionFile) => {
      const transaction = {
        title: data.title,
        value: data.value,
        type: data.type,
        category: data.category,
      };
      transactions.push(transaction);
      categories.push(data.category);

      // console.log('transactions', transactions);
    });

    await new Promise(resolve => streamCsv.on('end', resolve));

    const categoriesFound = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const categoriesTitles = categoriesFound.map(row => row.title);
    const selectedCategories = categories.filter(
      category => !categoriesTitles.includes(category),
    );
    const selectedCategoriesFiltered = Array.from(new Set(selectedCategories));

    const newCategories = categoriesRepository.create(
      selectedCategoriesFiltered.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);
    const allCategories = [...categoriesFound, ...newCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.title,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);
    await fs.promises.unlink(fileCsvPath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
