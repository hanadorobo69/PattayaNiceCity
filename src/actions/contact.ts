"use server";

import { prisma } from "@/lib/prisma";
import { sendContactEmail } from "@/lib/mail";

export async function submitContactMessage(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { name, email, subject, message } = formData;

  // Validate required fields
  if (!name || !name.trim()) {
    return { success: false, error: "Name is required" };
  }
  if (!email || !email.trim()) {
    return { success: false, error: "Email is required" };
  }
  if (!subject || !subject.trim()) {
    return { success: false, error: "Subject is required" };
  }
  if (!message || !message.trim()) {
    return { success: false, error: "Message is required" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { success: false, error: "Please enter a valid email address" };
  }

  try {
    // Save to database
    await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    // Send email to contact@pattayanicecity.com
    try {
      await sendContactEmail({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
    } catch (emailError) {
      // Email failed but message is saved in DB - don't block the user
      console.error("[contact] Email send failed:", emailError);
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to send your message. Please try again." };
  }
}
