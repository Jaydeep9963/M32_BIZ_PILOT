import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	createdAt: Date;
	toolName?: string;
}

export interface ChatDocument extends Document {
	userId: mongoose.Types.ObjectId;
	title: string;
	messages: ChatMessage[];
	createdAt: Date;
	updatedAt: Date;
}

export interface UserDocument extends Document {
	name: string;
	email: string;
	passwordHash: string;
	createdAt: Date;
}

export interface TaskDocument extends Document {
	userId: mongoose.Types.ObjectId;
	title: string;
	description?: string;
	status: 'open' | 'in_progress' | 'done';
	externalId?: string;
	createdAt: Date;
	updatedAt: Date;
}

const MessageSchema = new Schema<ChatMessage>({
	role: { type: String, enum: ['system', 'user', 'assistant', 'tool'], required: true },
	content: { type: String, required: true },
	createdAt: { type: Date, default: Date.now },
	toolName: { type: String },
});

const ChatSchema = new Schema<ChatDocument>({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
	title: { type: String, required: true },
	messages: { type: [MessageSchema], default: [] },
}, { timestamps: true });

const UserSchema = new Schema<UserDocument>({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true, index: true },
	passwordHash: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const UserModel: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
export const ChatModel: Model<ChatDocument> = mongoose.models.Chat || mongoose.model<ChatDocument>('Chat', ChatSchema);
const TaskSchema = new Schema<TaskDocument>({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
	title: { type: String, required: true },
	description: { type: String },
	status: { type: String, enum: ['open', 'in_progress', 'done'], default: 'open' },
	externalId: { type: String },
}, { timestamps: true });

export const TaskModel: Model<TaskDocument> = mongoose.models.Task || mongoose.model<TaskDocument>('Task', TaskSchema);


