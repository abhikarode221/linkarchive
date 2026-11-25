const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [30, 'Category name cannot exceed 30 characters'],
    },
    nameLower: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    createdAt: {
      type: Number,
      default: () => Date.now(),
    },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.userId;
        delete ret.nameLower;
        return ret;
      },
    },
  }
);

categorySchema.index({ userId: 1, nameLower: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
