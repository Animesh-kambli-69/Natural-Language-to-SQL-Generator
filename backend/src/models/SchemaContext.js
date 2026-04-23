import mongoose from 'mongoose';

const schemaContextSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    dialect: {
      type: String,
      enum: ['postgresql', 'mysql', 'sqlite', 'redshift', 'bigquery'],
      default: 'postgresql'
    },
    schemaText: {
      type: String,
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

schemaContextSchema.index({ userId: 1, name: 1 }, { unique: true });

export const SchemaContext = mongoose.model('SchemaContext', schemaContextSchema);
