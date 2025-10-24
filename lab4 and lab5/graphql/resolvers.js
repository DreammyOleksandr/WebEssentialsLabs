const Document = require('../models/Document');
const { UserInputError, ApolloError } = require('apollo-server-express');

const resolvers = {
  Query: {
    // Отримати всі документи
    documents: async () => {
      try {
        return await Document.find().sort({ dateGiven: -1 });
      } catch (error) {
        throw new ApolloError('Помилка при отриманні документів', 'FETCH_ERROR');
      }
    },

    // Отримати документ за ID
    document: async (_, { id }) => {
      try {
        const document = await Document.findById(id);
        if (!document) {
          throw new UserInputError('Документ не знайдено', { field: 'id' });
        }
        return document;
      } catch (error) {
        if (error.name === 'CastError') {
          throw new UserInputError('Невірний формат ID', { field: 'id' });
        }
        throw error;
      }
    },

    // Отримати документи за виконавцем
    documentsByExecutor: async (_, { executor }) => {
      try {
        return await Document.find({ 
          executor: { $regex: executor, $options: 'i' } 
        }).sort({ dateGiven: -1 });
      } catch (error) {
        throw new ApolloError('Помилка при пошуку документів за виконавцем', 'SEARCH_ERROR');
      }
    },

    // Отримати документи за статусом
    documentsByStatus: async (_, { status }) => {
      try {
        let filter = {};
        if (status === 'active') {
          filter.dateReturned = null;
        } else if (status === 'returned') {
          filter.dateReturned = { $ne: null };
        } else {
          throw new UserInputError('Невірний статус. Використовуйте "active" або "returned"', { field: 'status' });
        }
        
        return await Document.find(filter).sort({ dateGiven: -1 });
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new ApolloError('Помилка при пошуку документів за статусом', 'SEARCH_ERROR');
      }
    }
  },

  Mutation: {
    // Створити новий документ
    createDocument: async (_, { input }) => {
      try {
        const { executor, document, dateGiven, dateReturned } = input;
        
        const newDocument = new Document({
          executor,
          document,
          dateGiven: new Date(dateGiven),
          dateReturned: dateReturned ? new Date(dateReturned) : null
        });

        return await newDocument.save();
      } catch (error) {
        if (error.name === 'ValidationError') {
          const validationErrors = Object.values(error.errors).map(err => err.message);
          throw new UserInputError(validationErrors.join(', '));
        }
        throw new ApolloError('Помилка при створенні документа', 'CREATE_ERROR');
      }
    },

    // Оновити документ
    updateDocument: async (_, { id, input }) => {
      try {
        const { executor, document, dateGiven, dateReturned } = input;
        
        const updateData = {};
        if (executor !== undefined) updateData.executor = executor;
        if (document !== undefined) updateData.document = document;
        if (dateGiven !== undefined) updateData.dateGiven = new Date(dateGiven);
        if (dateReturned !== undefined) {
          updateData.dateReturned = dateReturned ? new Date(dateReturned) : null;
        }

        const updatedDocument = await Document.findByIdAndUpdate(
          id, 
          updateData, 
          { 
            new: true, 
            runValidators: true 
          }
        );
        
        if (!updatedDocument) {
          throw new UserInputError('Документ не знайдено', { field: 'id' });
        }

        return updatedDocument;
      } catch (error) {
        if (error.name === 'ValidationError') {
          const validationErrors = Object.values(error.errors).map(err => err.message);
          throw new UserInputError(validationErrors.join(', '));
        }
        if (error.name === 'CastError') {
          throw new UserInputError('Невірний формат ID', { field: 'id' });
        }
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new ApolloError('Помилка при оновленні документа', 'UPDATE_ERROR');
      }
    },

    // Видалити документ
    deleteDocument: async (_, { id }) => {
      try {
        const deletedDocument = await Document.findByIdAndDelete(id);
        
        if (!deletedDocument) {
          throw new UserInputError('Документ не знайдено', { field: 'id' });
        }
        
        return true;
      } catch (error) {
        if (error.name === 'CastError') {
          throw new UserInputError('Невірний формат ID', { field: 'id' });
        }
        if (error instanceof UserInputError) {
          throw error;
        }
        throw new ApolloError('Помилка при видаленні документа', 'DELETE_ERROR');
      }
    }
  }
};

module.exports = resolvers;