export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_path: string | null;
          role: "owner" | "partner";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_path?: string | null;
          role?: "owner" | "partner";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      relationship_settings: {
        Row: {
          id: string;
          owner_id: string;
          relationship_title: string;
          partner_name: string;
          owner_name: string;
          owner_nickname: string | null;
          partner_nickname: string | null;
          relationship_start_date: string | null;
          birthday_date: string | null;
          unlock_title: string | null;
          unlock_hint: string | null;
          default_diary_tone: string;
          default_language: string;
          music_enabled: boolean;
          access_hash: string | null;
          chapter_labels: Record<string, string> | null;
          password_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          relationship_title: string;
          partner_name: string;
          owner_name: string;
          owner_nickname?: string | null;
          partner_nickname?: string | null;
          relationship_start_date?: string | null;
          birthday_date?: string | null;
          unlock_title?: string | null;
          unlock_hint?: string | null;
          default_diary_tone?: string;
          default_language?: string;
          music_enabled?: boolean;
          access_hash?: string | null;
          chapter_labels?: Record<string, string> | null;
          password_version?: number;
        };
        Update: Partial<Database["public"]["Tables"]["relationship_settings"]["Insert"]>;
      };
      photos: {
        Row: {
          id: string;
          owner_id: string;
          drive_file_id: string;
          drive_folder_id: string | null;
          thumbnail_path: string | null;
          original_filename: string;
          mime_type: string;
          width: number | null;
          height: number | null;
          size_bytes: number | null;
          taken_at: string | null;
          latitude: number | null;
          longitude: number | null;
          camera_model: string | null;
          orientation: number | null;
          caption: string | null;
          alt_text: string | null;
          dominant_subject: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          drive_file_id: string;
          drive_folder_id?: string | null;
          thumbnail_path?: string | null;
          original_filename: string;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          size_bytes?: number | null;
          taken_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          camera_model?: string | null;
          orientation?: number | null;
          caption?: string | null;
          alt_text?: string | null;
          dominant_subject?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
      };
      memory_events: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          one_line: string | null;
          diary_body: string | null;
          event_date: string;
          event_start_time: string | null;
          event_end_time: string | null;
          place_name: string | null;
          latitude: number | null;
          longitude: number | null;
          mood: string | null;
          chapter: string | null;
          template_id: string;
          cover_photo_id: string | null;
          status: "draft" | "published" | "archived";
          is_featured: boolean;
          ai_generated: boolean;
          ai_confidence: number | null;
          published_at: string | null;
          user_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          one_line?: string | null;
          diary_body?: string | null;
          event_date: string;
          event_start_time?: string | null;
          event_end_time?: string | null;
          place_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          mood?: string | null;
          chapter?: string | null;
          template_id: string;
          cover_photo_id?: string | null;
          status?: "draft" | "published" | "archived";
          is_featured?: boolean;
          ai_generated?: boolean;
          ai_confidence?: number | null;
          published_at?: string | null;
          user_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["memory_events"]["Insert"]>;
      };
      letters: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          body: string;
          letter_date: string | null;
          status: "draft" | "published";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          body: string;
          letter_date?: string | null;
          status?: "draft" | "published";
        };
        Update: Partial<Database["public"]["Tables"]["letters"]["Insert"]>;
      };
      letter_replies: {
        Row: {
          id: string;
          owner_id: string;
          letter_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          letter_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["letter_replies"]["Insert"]>;
      };
    };
  };
};
