-- Seed the product mappings based on your provided table
INSERT INTO affiliate_product_mappings (genre, platform, product_type, search_query_template, commission_range)
VALUES 
('Action', 'Amazon', 'Gaming gear', '{{title}} gaming accessories', '4-10%'),
('Action', 'Entertainment Earth', 'Action figures', '{{title}} action figure', '7-10%'),
('Romance', 'Blippo', 'Kawaii fashion', '{{title}} kawaii merchandise', '8-20%'),
('Fantasy', 'Amazon', 'Art books', '{{title}} art book', '4-10%'),
('Horror', 'Amazon', 'Gothic apparel', '{{title}} horror t-shirt', '4-10%'),
('Comedy', 'Blippo', 'Plushies', '{{title}} plush toy', '8-20%');

-- Enable the feature flag for everyone for local testing
UPDATE feature_flags 
SET enabled = true, 
    enabled_for_roles = ARRAY['admin', 'user', 'moderator'] 
WHERE name = 'affiliate_links';