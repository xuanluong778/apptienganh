USE english_app;

CREATE TABLE IF NOT EXISTS vocabulary (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  word VARCHAR(120) NOT NULL,
  ipa VARCHAR(120) NULL,
  example_sentence VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  level ENUM('beginner','elementary','intermediate') NOT NULL DEFAULT 'beginner',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vocabulary_word_level (word, level),
  INDEX idx_vocabulary_level (level),
  INDEX idx_vocabulary_word (word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
