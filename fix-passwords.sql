-- fix-passwords.sql
-- Run this if your employee records have invalid password hashes.
-- All passwords are reset to: Password123!
-- Execute: psql -U aeronetb_user -d aeronetb -f fix-passwords.sql

SET search_path TO aeronetb;

UPDATE employee SET password_hash = '$2a$10$lAMjxM0CstO5x1BSAUFQgO0meQqmMlh/xvRggS/qyC57nMJbRvE8e' WHERE email = 'a.papadaki@aeronetb.com';
UPDATE employee SET password_hash = '$2a$10$5jg2ifk82/Cae9MtbTmOkOePf.DTBcga3zSfLaZmz3VtrUxWrZG6i' WHERE email = 'd.stavros@aeronetb.com';
UPDATE employee SET password_hash = '$2a$10$uOE0c2F3QITmh9wqV21NyuiX3gVcQb.vHyQ/0QyOHb7FjwNm1ccxa' WHERE email = 'e.christodoulou@aeronetb.com';
UPDATE employee SET password_hash = '$2a$10$.VRxNF34qgU65OBUdldfKucJG8E76QK5RhJHWpzP9Ke5vLqKWRsfi'  WHERE email = 'n.angelopoulos@aeronetb.com';
UPDATE employee SET password_hash = '$2a$10$wLQCDoEWGA9cQRwQGJ58H.52BOR0U7SM9B2qaoSHKljAb/2PrOo/W'  WHERE email = 'm.katsaros@aeronetb.com';
UPDATE employee SET password_hash = '$2a$10$M90J34olvMUYNOwjDzuME.3zuIAEG5Cu5Sn4N633i0YSUZ/bTISda'  WHERE email = 'k.georgiou@aeronetb.com';

SELECT email, LEFT(password_hash,10)||'...' AS hash_preview, is_active FROM employee ORDER BY emp_id;
