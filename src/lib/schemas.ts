
import { z } from 'zod';


export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export const SignupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  userType: z.enum(['seller', 'buyer','addmin'], { required_error: "Please select your role." }),
  primarySpokenLanguage: z.string().min(2, {message: "Language name should be at least 2 characters."}).optional().or(z.literal('')),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const UserProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  email: z.string().email({ message: "Invalid email address." }).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  verificationType: z.enum(["NIN", "Passport", ""]).optional(),
  verificationNumber: z.string().optional(),
  primarySpokenLanguage: z.string().min(2, {message: "Language name should be at least 2 characters."}).optional().or(z.literal('')),
});

export const CommodityUploadSchema = z.object({
  name: z.string().min(3, { message: "Commodity name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  categoryId: z.string({ required_error: "Please select a category." }),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().positive({ message: "Price must be a positive number." })
  ),
  unit: z.string().min(1, { message: "Unit is required (e.g., kg, piece)." }),
  imageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
  sellerContact: z.string().optional(),
  location: z.string().optional(),
  externalLink: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

export const ReviewSchema = z.object({
  rating: z.number().min(1, { message: "Rating is required." }).max(5),
  comment: z.string().min(10, { message: "Comment must be at least 10 characters." }).max(500, { message: "Comment cannot exceed 500 characters." }),
});


// Schema for AI-generated market trend data points
export const MarketTrendDataPointSchema = z.object({
  date: z.string().describe("The date for the data point, in 'YYYY-MM-DD' format."),
  price: z.number().describe("The average price of the commodity on that date."),
});

// Schema for the entire market trend object, for AI output validation
export const MarketTrendSchema = z.object({
  commodityName: z.string().describe("The name of the commodity."),
  data: z.array(MarketTrendDataPointSchema).describe("An array of 7 data points for the last 7 months."),
});
