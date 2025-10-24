const { gql } = require('apollo-server-express')

const typeDefs = gql`
  type Document {
    id: String!
    executor: String!
    document: String!
    dateGiven: String!
    dateReturned: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    documents: [Document!]!
    document(id: ID!): Document
    documentsByExecutor(executor: String!): [Document!]!
    documentsByStatus(status: String!): [Document!]!
  }

  type Mutation {
    createDocument(input: CreateDocumentInput!): Document!
    updateDocument(id: ID!, input: UpdateDocumentInput!): Document!
    deleteDocument(id: ID!): Boolean!
  }

  input CreateDocumentInput {
    executor: String!
    document: String!
    dateGiven: String!
    dateReturned: String
  }

  input UpdateDocumentInput {
    executor: String
    document: String
    dateGiven: String
    dateReturned: String
  }
`

module.exports = typeDefs
