DO $$
BEGIN
    DELETE FROM public.team_members 
    WHERE user_id = '2a62db2c-105f-4e49-86cd-b95d5e02ce42' 
    AND module = 'SOSFU';

    RAISE NOTICE 'Removed Mauro Silva from SOSFU team_members';
END $$;
