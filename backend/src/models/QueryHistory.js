import mongoose from 'mongoose';

const queryHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    schemaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchemaContext'
    },
    question: {
      type: String,
      required: true
    },
    generatedSql: {
      type: String,
      required: true
    },
    dialect: {
      type: String,
      required: true
    },
    sourceLatencyMs: {
      type: Number,
      default: 0
    },
    provider: {
      type: String,
      default: 'mock'
    },
    model: {
      type: String,
      default: 'mock-v1'
    }
  },
  {
    timestamps: true
  }
);

queryHistorySchema.index({ userId: 1, createdAt: -1 });

export const QueryHistory = mongoose.model('QueryHistory', queryHistorySchema);
