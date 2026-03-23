-- Seed client branding from dev kits
-- Prince Andam — from BRAND_CONTEXT.md (purple theme)
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'Prince Andam', '#09090B', '#a855f7', '#ffffff', 'Space Grotesk', 'Inter'
FROM clients WHERE name = 'Prince Andam'
ON CONFLICT (client_id) DO NOTHING;

-- Kyle Painter / Disruptors Media (amber/gold theme)
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'Disruptors Media', '#09090B', '#f59e0b', '#ffffff', 'Montserrat', 'Inter'
FROM clients WHERE name = 'Kyle Painter'
ON CONFLICT (client_id) DO NOTHING;

-- CandyPay (pink theme — sub-client of Prince)
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'CandyPay', '#09090B', '#ec4899', '#ffffff', 'Inter', 'Inter'
FROM clients WHERE name ILIKE '%candy%'
ON CONFLICT (client_id) DO NOTHING;

-- Juan Martinez (blue theme)
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'Juan Martinez', '#09090B', '#3b82f6', '#ffffff', 'Inter', 'Inter'
FROM clients WHERE name = 'Juan Martinez'
ON CONFLICT (client_id) DO NOTHING;

-- Joshua Kokoumi (teal theme)
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'Joshua Kokoumi', '#09090B', '#14b8a6', '#ffffff', 'Inter', 'Inter'
FROM clients WHERE name ILIKE '%joshua%'
ON CONFLICT (client_id) DO NOTHING;

-- Sebastian (emerald theme — sub-client of Prince)
INSERT INTO client_branding (client_id, brand_name, primary_bg, accent_color, text_color, font_heading, font_body)
SELECT id, 'Sebastian', '#09090B', '#10b981', '#ffffff', 'Inter', 'Inter'
FROM clients WHERE name ILIKE '%sebastian%'
ON CONFLICT (client_id) DO NOTHING;

-- All other clients use SUMAIT AI defaults (no row = fallback)
