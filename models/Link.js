const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'General',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    favorite: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
      index: true,
    },
    visits: {
      type: Number,
      default: 0,
      min: 0,
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
        return ret;
      },
    },
  }
);

linkSchema.index({ userId: 1, createdAt: -1 });
linkSchema.index({ userId: 1, category: 1 });
linkSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('Link', linkSchema);
