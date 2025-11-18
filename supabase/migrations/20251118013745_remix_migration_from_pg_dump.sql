--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: periodic_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodic_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    interval_minutes integer NOT NULL,
    use_random_phrase boolean DEFAULT true,
    specific_phrase_id uuid,
    use_intelligent_delay boolean DEFAULT false,
    is_active boolean DEFAULT true,
    last_posted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: phrases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phrases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: threads_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.threads_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id text NOT NULL,
    access_token text NOT NULL,
    username text,
    is_active boolean DEFAULT true,
    connected_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: periodic_posts periodic_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodic_posts
    ADD CONSTRAINT periodic_posts_pkey PRIMARY KEY (id);


--
-- Name: phrases phrases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrases
    ADD CONSTRAINT phrases_pkey PRIMARY KEY (id);


--
-- Name: threads_accounts threads_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threads_accounts
    ADD CONSTRAINT threads_accounts_pkey PRIMARY KEY (id);


--
-- Name: threads_accounts threads_accounts_user_id_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threads_accounts
    ADD CONSTRAINT threads_accounts_user_id_account_id_key UNIQUE (user_id, account_id);


--
-- Name: periodic_posts update_periodic_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_periodic_posts_updated_at BEFORE UPDATE ON public.periodic_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: phrases update_phrases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_phrases_updated_at BEFORE UPDATE ON public.phrases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: threads_accounts update_threads_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_threads_accounts_updated_at BEFORE UPDATE ON public.threads_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: periodic_posts periodic_posts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodic_posts
    ADD CONSTRAINT periodic_posts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.threads_accounts(id) ON DELETE CASCADE;


--
-- Name: periodic_posts periodic_posts_specific_phrase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodic_posts
    ADD CONSTRAINT periodic_posts_specific_phrase_id_fkey FOREIGN KEY (specific_phrase_id) REFERENCES public.phrases(id) ON DELETE SET NULL;


--
-- Name: periodic_posts periodic_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodic_posts
    ADD CONSTRAINT periodic_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: phrases phrases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phrases
    ADD CONSTRAINT phrases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: threads_accounts threads_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.threads_accounts
    ADD CONSTRAINT threads_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: threads_accounts Users can delete their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own accounts" ON public.threads_accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: periodic_posts Users can delete their own periodic posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own periodic posts" ON public.periodic_posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: phrases Users can delete their own phrases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own phrases" ON public.phrases FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: threads_accounts Users can insert their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own accounts" ON public.threads_accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: periodic_posts Users can insert their own periodic posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own periodic posts" ON public.periodic_posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: phrases Users can insert their own phrases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own phrases" ON public.phrases FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: threads_accounts Users can update their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own accounts" ON public.threads_accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: periodic_posts Users can update their own periodic posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own periodic posts" ON public.periodic_posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: phrases Users can update their own phrases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own phrases" ON public.phrases FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: threads_accounts Users can view their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own accounts" ON public.threads_accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: periodic_posts Users can view their own periodic posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own periodic posts" ON public.periodic_posts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: phrases Users can view their own phrases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own phrases" ON public.phrases FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: periodic_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.periodic_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: phrases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;

--
-- Name: threads_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.threads_accounts ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


