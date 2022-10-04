--
-- PostgreSQL database dump
--

-- Dumped from database version 11.8 (Ubuntu 11.8-1.pgdg18.04+1)
-- Dumped by pg_dump version 13.5

-- Started on 2022-08-04 16:45:31

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5323 (class 1262 OID 28232)
-- Name: stretor; Type: DATABASE; Schema: -; Owner: user_stretor
--

CREATE DATABASE stretor WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'en_US.UTF-8';


ALTER DATABASE stretor OWNER TO user_stretor;

\connect stretor

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5324 (class 0 OID 0)
-- Name: stretor; Type: DATABASE PROPERTIES; Schema: -; Owner: user_stretor
--

ALTER DATABASE stretor SET search_path TO '$user', 'public', 'sde';


\connect stretor

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 10 (class 2615 OID 29811)
-- Name: catasto; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA catasto;


ALTER SCHEMA catasto OWNER TO postgres;

--
-- TOC entry 12 (class 2615 OID 29812)
-- Name: gis_data; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA gis_data;


ALTER SCHEMA gis_data OWNER TO postgres;

--
-- TOC entry 11 (class 2615 OID 29813)
-- Name: grafo; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA grafo;


ALTER SCHEMA grafo OWNER TO postgres;

--
-- TOC entry 3 (class 3079 OID 28233)
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry, geography, and raster spatial types and functions';


--
-- TOC entry 2 (class 3079 OID 29814)
-- Name: postgres_fdw; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgres_fdw WITH SCHEMA public;


--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION postgres_fdw; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgres_fdw IS 'foreign-data wrapper for remote PostgreSQL servers';


--
-- TOC entry 1597 (class 1255 OID 29818)
-- Name: get_geom_from_xy(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_geom_from_xy() RETURNS trigger
    LANGUAGE plpgsql STRICT
    AS $$
DECLARE
  geom geometry;
  srid int;
  x double precision;
  y double precision;
BEGIN
  -- initialization
  x  = NULL;
  y  = NULL;

  -- retrieve srid
  SELECT Find_SRID(quote_ident(TG_TABLE_SCHEMA), quote_ident(TG_TABLE_NAME), 'geom') INTO srid;
  -- debug RAISE NOTICE 'srid: %',srid;

  -- on insert calculate geom
  IF (TG_OP = 'INSERT') THEN
     -- if coords are both valuated then we set geom
     IF (NEW.x IS NOT NULL) THEN
	SELECT ST_SetSRID(ST_MakePoint(NEW.x, NEW.y), srid) INTO geom;
	-- debug RAISE NOTICE 'insert geom: %',geom;
	NEW.geom = geom;
     END IF;
  ELSEIF (TG_OP = 'UPDATE') THEN
     
        IF (OLD.geom IS NULL) THEN
          -- if OLD geom is null and NEW coords are not null
          IF (NEW.x IS NOT NULL) THEN
	     x = NEW.x;
	     y = NEW.y;
          END IF;

        ELSE 
          -- if OLD geom is not null and NEW coords are not null
	  IF (NEW.x IS NOT NULL OR NEW.y IS NOT NULL) THEN
	     IF (NEW.x IS NULL) THEN
	        x = OLD.x;
	        y = NEW.y;
             ELSEIF (NEW.y IS NULL) THEN
	        x = NEW.x;
	        y = OLD.y;
	     ELSE
	        x = NEW.x;
	        y = NEW.y;
             END IF;
	  ELSE
	    -- we receive y and x both NULL -> update geom to NULL
	    NEW.geom = NULL;
	  END IF;

	END IF;  
  
     IF (y IS NOT NULL) THEN
        SELECT ST_SetSRID(ST_MakePoint(x, y), srid) INTO geom;
        NEW.geom = geom;
        NEW.y  = y;
        NEW.x  = x;
     END IF;
 
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.get_geom_from_xy() OWNER TO postgres;

--
-- TOC entry 1598 (class 1255 OID 29819)
-- Name: get_length_from_geom(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_length_from_geom() RETURNS trigger
    LANGUAGE plpgsql STRICT
    AS $$
DECLARE
  lenArco double precision;
  srid int;
  x double precision;
  y double precision;
BEGIN
  -- initialization
  x  = NULL;
  y  = NULL;

  -- retrieve srid
  SELECT Find_SRID(quote_ident(TG_TABLE_SCHEMA), quote_ident(TG_TABLE_NAME), 'geom') INTO srid;
  -- debug RAISE NOTICE 'srid: %',srid;

  -- on insert calculate geom
  IF (TG_OP = 'INSERT') THEN
    -- if coords are both valuated then we set geom
    IF (NEW.geom IS NOT NULL) THEN
      SELECT round(CAST(ST_Length(NEW.geom) as numeric), 2) INTO lenArco;
      -- debug RAISE NOTICE 'calculate length arco: %',lenArco;
      NEW.lunghezza = lenArco;
    END IF;

  ELSEIF (TG_OP = 'UPDATE') THEN

    IF (NEW.geom IS NOT NULL) THEN
      SELECT round(CAST(ST_Length(NEW.geom) as numeric), 2) INTO lenArco;
      -- debug RAISE NOTICE 'calculate length arco: %',lenArco;
      NEW.lunghezza = lenArco;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.get_length_from_geom() OWNER TO postgres;

--
-- TOC entry 1599 (class 1255 OID 29820)
-- Name: manage_municipi_localita_via(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.manage_municipi_localita_via(idcivico integer) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
DECLARE
  codVia      integer;
  retCodVia   integer;
  municipiArr character varying [];
  localitaArr character varying [];
BEGIN

  -- find cod_via for given idCivico
  SELECT cod_via
  FROM grafo.view_civico
  WHERE id = $1
  INTO codVia;

  -- check previous query result
  IF (codVia IS NULL) THEN
    RAISE WARNING 'No cod_via founded for civico %',idCivico;
    RETURN -1;
  END IF;
  
  -- find all municipi for all valid civici on codVia
  municipiArr := ARRAY(
    SELECT distinct(id_zona)
    FROM grafo.view_civico_zona
    WHERE id_civico IN (
      SELECT id
      FROM grafo.view_civico
      WHERE cod_via = codVia
      AND is_valid_now = true)
    AND name = 'MUNICIPI'
  );

  localitaArr := ARRAY(
    SELECT distinct(id_zona)
    FROM grafo.view_civico_zona
    WHERE id_civico IN (
      SELECT id
      FROM grafo.view_civico
      WHERE cod_via = codVia
      AND is_valid_now = true)
    AND name = 'LOCA'
  );

  -- update via table
  UPDATE grafo.via
  SET localita  = localitaArr,
      municipio = municipiArr
  WHERE cod_via = codVia
  RETURNING cod_via
  INTO retCodVia;

  -- check result and return
  IF (retCodVia = codVia) THEN
    RAISE INFO 'Updated arrays of localita and municipi of the via %',codVia;
    RETURN 1;
  ELSE
    RAISE WARNING 'Failure on update arrays of localita and municipi of the via %',codVia;
    RETURN -1;
  END IF;

END; $_$;


ALTER FUNCTION public.manage_municipi_localita_via(idcivico integer) OWNER TO postgres;

--
-- TOC entry 1601 (class 1255 OID 33595)
-- Name: set_mun_for_arco(); Type: FUNCTION; Schema: public; Owner: user_stretor
--

CREATE FUNCTION public.set_mun_for_arco() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    cur    refcursor;
    rec    record;
    munEven  varchar;
    munOdd   varchar;
begin
	-- this function update id_muni_pari and id_muni_dispari attributes for all arco table record
	-- based on civici belongs arco
	-- old values are removed
	open cur for
      SELECT cod_arco 
      FROM grafo.arco
      where data_fine is null;
     
    loop
        fetch next from cur into rec;
        exit when rec is null;

        -- select municipio even
        select (select z.id from grafo.zona z where st_contains(z.geom,c.geom) and z.id_tipo=2) as mun
        from grafo.civico c
        where cod_arco = rec.cod_arco
        and numero%2 = 0
        into munEven;

        -- select municipio odd
        select (select z.id from grafo.zona z where st_contains(z.geom,c.geom) and z.id_tipo=2) as mun
        from grafo.civico c
        where cod_arco = rec.cod_arco
        and numero%2 = 1
        into munOdd;

        -- update via
        update grafo.arco set id_muni_pari = munEven, id_muni_disp = munOdd where cod_arco = rec.cod_arco;
    end loop;

    close cur; 
END;
$$;


ALTER FUNCTION public.set_mun_for_arco() OWNER TO user_stretor;

--
-- TOC entry 1600 (class 1255 OID 33588)
-- Name: set_mun_loc_for_via(); Type: FUNCTION; Schema: public; Owner: user_stretor
--

CREATE FUNCTION public.set_mun_loc_for_via() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    cur    refcursor;
    rec    record;
    aLoc   varchar[];
    aMun   varchar[];
begin
	-- this function update localita and municipio attributes for all via table record
	-- based on civici belongs via
	-- old values are removed
	open cur for
      SELECT cod_via 
      FROM grafo.via;
     
    loop
        fetch next from cur into rec;
        exit when rec is null;

        -- initialize array
        aMun = '{}';
        aLoc = '{}';
 
        -- select municipio array
        select array_agg(distinct(id_zona))
        from grafo.civico_zona
        where id_civico in (select id from grafo.civico where cod_via = rec.cod_via)
        and id_zona like '2|%'
        into aMun;

        -- select localita array
        select array_agg(distinct(id_zona))
        from grafo.civico_zona
        where id_civico in (select id from grafo.civico where cod_via = rec.cod_via)
        and id_zona like '1|%'
        into aLoc;

        -- update via
        update grafo.via set localita = aLoc, municipio = aMun where cod_via = rec.cod_via;
    end loop;

    close cur; 
END;
$$;


ALTER FUNCTION public.set_mun_loc_for_via() OWNER TO user_stretor;

--
-- TOC entry 1603 (class 1255 OID 33599)
-- Name: set_mun_loc_for_via_by_arco(); Type: FUNCTION; Schema: public; Owner: user_stretor
--

CREATE FUNCTION public.set_mun_loc_for_via_by_arco() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    cur     refcursor;
    rec     record;
    aArco   integer[];
    codArco integer;
    aLoc    varchar[];
    aMun    varchar[];
    tmpMun  varchar;
    tmpLoc  varchar;
begin

	open cur for
      SELECT cod_via
      FROM grafo.via
      where data_fine is null and (localita is null or municipio is null);
     
    loop
        fetch next from cur into rec;
        exit when rec is null;

       -- initialize array
        aArco = '{}';
       	aLoc  = '{}';
        aMun  = '{}';

        select array_agg(cod_arco)
        from grafo.arco a 
        where a.cod_via = rec.cod_via
        into aArco;
       
      IF array_length(aArco, 1) > 0 THEN
      FOREACH codArco IN ARRAY aArco
         loop
            --raise notice 'codArco %', codArco;

            -- select municipio array
            select (select z.id from grafo.zona z where st_contains(z.geom,a.geom) and z.id_tipo=2) as municipio 
            from grafo.arco a
            where cod_arco = codArco
            into tmpMun;
                    
           if (not(SELECT tmpMun = ANY (aMun))) then
            	select array_append(aMun, 
                                	(select (select z.id from grafo.zona z where st_contains(z.geom,a.geom) and z.id_tipo=2) as municipio 
                                	from grafo.arco a
                                	where cod_arco = codArco)) into aMun;
            	--raise notice 'aMun %', aMun;
			end if;

            -- select localita array
            select (select z.id from grafo.zona z where st_contains(z.geom,a.geom) and z.id_tipo=1) as localita 
            from grafo.arco a
            where cod_arco = codArco
            into tmpLoc;
                      
            if (not(SELECT tmpLoc = ANY (aLoc))) then
            	select array_append(aLoc, 
                               	 	(select (select z.id from grafo.zona z where st_contains(z.geom,a.geom) and z.id_tipo=1) as localita 
                               		 from grafo.arco a
                                	where cod_arco = codArco)) into aLoc; 
            	--raise notice 'aLoc %', aLoc;
            end if;

         END LOOP;
                       
        -- update via
        update grafo.via set localita = aLoc, municipio = aMun where cod_via = rec.cod_via;
       
       end if;

    end loop;

    close cur; 
END;
$$;


ALTER FUNCTION public.set_mun_loc_for_via_by_arco() OWNER TO user_stretor;

--
-- TOC entry 1602 (class 1255 OID 33598)
-- Name: set_quartiere_for_arco(); Type: FUNCTION; Schema: public; Owner: user_stretor
--

CREATE FUNCTION public.set_quartiere_for_arco() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    cur    refcursor;
    rec    record;
    qEven  varchar;
    qOdd   varchar;
begin
	-- this function update id_quart_pari and id_quart_disp attributes for all arco table record
	-- based on civici belongs arco
	-- old values are removed
	open cur for
      SELECT cod_arco 
      FROM grafo.arco
      where data_fine is null;
     
    loop
        fetch next from cur into rec;
        exit when rec is null;

        -- select quartiere even
        select (select z.id from grafo.zona z where st_contains(z.geom,c.geom) and z.id_tipo=1) as quartiere 
        from grafo.civico c
        where cod_arco = rec.cod_arco
        and numero%2 = 0
        into qEven;

        -- select quartiere odd
        select (select z.id from grafo.zona z where st_contains(z.geom,c.geom) and z.id_tipo=1) as quartiere 
        from grafo.civico c
        where cod_arco = rec.cod_arco
        and numero%2 = 1
        into qOdd;

        -- update via
        update grafo.arco set id_quart_pari = qEven, id_quart_disp = qOdd where cod_arco = rec.cod_arco;
    end loop;

    close cur; 
END;
$$;


ALTER FUNCTION public.set_quartiere_for_arco() OWNER TO user_stretor;

--
-- TOC entry 3672 (class 1417 OID 29821)
-- Name: foreign_server_catasto; Type: SERVER; Schema: -; Owner: postgres
--

CREATE SERVER foreign_server_catasto FOREIGN DATA WRAPPER postgres_fdw OPTIONS (
    dbname 'sitav_bari',
    extensions 'postgis',
    host '94.94.215.133',
    port '5432'
);


ALTER SERVER foreign_server_catasto OWNER TO postgres;

--
-- TOC entry 5328 (class 0 OID 0)
-- Name: USER MAPPING postgres SERVER foreign_server_catasto; Type: USER MAPPING; Schema: -; Owner: postgres
--

CREATE USER MAPPING FOR postgres SERVER foreign_server_catasto OPTIONS (
    password 'sd$423786frk',
    "user" 'sitav_bari_readeronly_catasto'
);


SET default_tablespace = '';

--
-- TOC entry 216 (class 1259 OID 29823)
-- Name: catasto; Type: FOREIGN TABLE; Schema: catasto; Owner: postgres
--

CREATE FOREIGN TABLE catasto.catasto (
    gid integer NOT NULL,
    tipo character varying(1),
    foglio integer,
    numero character varying(5),
    sezione character varying(1),
    allegato character varying(1),
    codice_comune character varying(4) NOT NULL,
    nomefile character varying(11),
    geom public.geometry(Polygon,32633),
    task_id character varying(255)
)
SERVER foreign_server_catasto
OPTIONS (
    schema_name 'catasto',
    table_name 'catasto'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN gid OPTIONS (
    column_name 'gid'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN tipo OPTIONS (
    column_name 'tipo'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN foglio OPTIONS (
    column_name 'foglio'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN numero OPTIONS (
    column_name 'numero'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN sezione OPTIONS (
    column_name 'sezione'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN allegato OPTIONS (
    column_name 'allegato'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN codice_comune OPTIONS (
    column_name 'codice_comune'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN nomefile OPTIONS (
    column_name 'nomefile'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN geom OPTIONS (
    column_name 'geom'
);
ALTER FOREIGN TABLE catasto.catasto ALTER COLUMN task_id OPTIONS (
    column_name 'task_id'
);


ALTER FOREIGN TABLE catasto.catasto OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 29826)
-- Name: catastoClone; Type: FOREIGN TABLE; Schema: catasto; Owner: postgres
--

CREATE FOREIGN TABLE catasto."catastoClone" (
    gid integer,
    tipo character varying(1),
    foglio integer,
    numero character varying(5),
    sezione character varying(1),
    allegato character varying(1),
    codice_comune character varying(4),
    nomefile character varying(11),
    geom public.geometry(Polygon,32633),
    task_id character varying(255)
)
SERVER foreign_server_catasto
OPTIONS (
    schema_name 'catasto',
    table_name 'catastoClone'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN gid OPTIONS (
    column_name 'gid'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN tipo OPTIONS (
    column_name 'tipo'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN foglio OPTIONS (
    column_name 'foglio'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN numero OPTIONS (
    column_name 'numero'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN sezione OPTIONS (
    column_name 'sezione'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN allegato OPTIONS (
    column_name 'allegato'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN codice_comune OPTIONS (
    column_name 'codice_comune'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN nomefile OPTIONS (
    column_name 'nomefile'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN geom OPTIONS (
    column_name 'geom'
);
ALTER FOREIGN TABLE catasto."catastoClone" ALTER COLUMN task_id OPTIONS (
    column_name 'task_id'
);


ALTER FOREIGN TABLE catasto."catastoClone" OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 29829)
-- Name: fogli_catasto; Type: FOREIGN TABLE; Schema: catasto; Owner: postgres
--

CREATE FOREIGN TABLE catasto.fogli_catasto (
    id bigint,
    geom public.geometry(Polygon,32633),
    geomid bigint,
    sezione character varying(1),
    foglio integer,
    allegato character varying(1),
    fg_sez_all text
)
SERVER foreign_server_catasto
OPTIONS (
    schema_name 'catasto',
    table_name 'fogli_catasto'
);
ALTER FOREIGN TABLE catasto.fogli_catasto ALTER COLUMN id OPTIONS (
    column_name 'id'
);
ALTER FOREIGN TABLE catasto.fogli_catasto ALTER COLUMN geom OPTIONS (
    column_name 'geom'
);
ALTER FOREIGN TABLE catasto.fogli_catasto ALTER COLUMN geomid OPTIONS (
    column_name 'geomid'
);
ALTER FOREIGN TABLE catasto.fogli_catasto ALTER COLUMN sezione OPTIONS (
    column_name 'sezione'
);
ALTER FOREIGN TABLE catasto.fogli_catasto ALTER COLUMN foglio OPTIONS (
    column_name 'foglio'
);
ALTER FOREIGN TABLE catasto.fogli_catasto ALTER COLUMN allegato OPTIONS (
    column_name 'allegato'
);
ALTER FOREIGN TABLE catasto.fogli_catasto ALTER COLUMN fg_sez_all OPTIONS (
    column_name 'fg_sez_all'
);


ALTER FOREIGN TABLE catasto.fogli_catasto OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 29832)
-- Name: vwm_catasto; Type: FOREIGN TABLE; Schema: catasto; Owner: postgres
--

CREATE FOREIGN TABLE catasto.vwm_catasto (
    id bigint,
    gid integer,
    tipo character varying(1),
    foglio integer,
    numero character varying(5),
    sezione character varying(1),
    allegato character varying(1),
    codice_comune character varying(4),
    nomefile character varying(11),
    geom public.geometry(Polygon,32633),
    task_id character varying(255)
)
SERVER foreign_server_catasto
OPTIONS (
    schema_name 'catasto',
    table_name 'vwm_catasto'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN id OPTIONS (
    column_name 'id'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN gid OPTIONS (
    column_name 'gid'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN tipo OPTIONS (
    column_name 'tipo'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN foglio OPTIONS (
    column_name 'foglio'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN numero OPTIONS (
    column_name 'numero'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN sezione OPTIONS (
    column_name 'sezione'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN allegato OPTIONS (
    column_name 'allegato'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN codice_comune OPTIONS (
    column_name 'codice_comune'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN nomefile OPTIONS (
    column_name 'nomefile'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN geom OPTIONS (
    column_name 'geom'
);
ALTER FOREIGN TABLE catasto.vwm_catasto ALTER COLUMN task_id OPTIONS (
    column_name 'task_id'
);


ALTER FOREIGN TABLE catasto.vwm_catasto OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 29835)
-- Name: view_catasto_acque; Type: VIEW; Schema: catasto; Owner: postgres
--

CREATE VIEW catasto.view_catasto_acque AS
 SELECT vwm_catasto.id AS rowid,
    vwm_catasto.gid,
    vwm_catasto.foglio,
    vwm_catasto.numero,
    vwm_catasto.sezione,
    vwm_catasto.allegato,
    vwm_catasto.codice_comune,
    vwm_catasto.geom
   FROM catasto.vwm_catasto
  WHERE ((vwm_catasto.tipo)::text = 'A'::text);


ALTER TABLE catasto.view_catasto_acque OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 29839)
-- Name: view_catasto_fabbricati; Type: VIEW; Schema: catasto; Owner: postgres
--

CREATE VIEW catasto.view_catasto_fabbricati AS
 SELECT vwm_catasto.id AS rowid,
    vwm_catasto.gid,
    vwm_catasto.foglio,
    vwm_catasto.numero,
    vwm_catasto.sezione,
    vwm_catasto.allegato,
    vwm_catasto.codice_comune,
    vwm_catasto.geom
   FROM catasto.vwm_catasto
  WHERE ((vwm_catasto.tipo)::text = 'F'::text);


ALTER TABLE catasto.view_catasto_fabbricati OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 29843)
-- Name: view_catasto_particelle; Type: VIEW; Schema: catasto; Owner: postgres
--

CREATE VIEW catasto.view_catasto_particelle AS
 SELECT vwm_catasto.id AS rowid,
    vwm_catasto.gid,
    vwm_catasto.foglio,
    vwm_catasto.numero,
    vwm_catasto.sezione,
    vwm_catasto.allegato,
    vwm_catasto.codice_comune,
    vwm_catasto.geom
   FROM catasto.vwm_catasto
  WHERE ((vwm_catasto.tipo)::text = 'T'::text);


ALTER TABLE catasto.view_catasto_particelle OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 29847)
-- Name: view_catasto_strade; Type: VIEW; Schema: catasto; Owner: postgres
--

CREATE VIEW catasto.view_catasto_strade AS
 SELECT vwm_catasto.id AS rowid,
    vwm_catasto.gid,
    vwm_catasto.foglio,
    vwm_catasto.numero,
    vwm_catasto.sezione,
    vwm_catasto.allegato,
    vwm_catasto.codice_comune,
    vwm_catasto.geom
   FROM catasto.vwm_catasto
  WHERE ((vwm_catasto.tipo)::text = 'S'::text);


ALTER TABLE catasto.view_catasto_strade OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 29851)
-- Name: vwm_catasto2_old; Type: FOREIGN TABLE; Schema: catasto; Owner: postgres
--

CREATE FOREIGN TABLE catasto.vwm_catasto2_old (
    id bigint,
    gid integer,
    tipo character varying(1),
    foglio integer,
    numero character varying(5),
    sezione character varying(1),
    allegato character varying(1),
    codice_comune character varying(4),
    nomefile character varying(11),
    geom public.geometry(Polygon,32633),
    task_id character varying(255)
)
SERVER foreign_server_catasto
OPTIONS (
    schema_name 'catasto',
    table_name 'vwm_catasto2_old'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN id OPTIONS (
    column_name 'id'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN gid OPTIONS (
    column_name 'gid'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN tipo OPTIONS (
    column_name 'tipo'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN foglio OPTIONS (
    column_name 'foglio'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN numero OPTIONS (
    column_name 'numero'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN sezione OPTIONS (
    column_name 'sezione'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN allegato OPTIONS (
    column_name 'allegato'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN codice_comune OPTIONS (
    column_name 'codice_comune'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN nomefile OPTIONS (
    column_name 'nomefile'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN geom OPTIONS (
    column_name 'geom'
);
ALTER FOREIGN TABLE catasto.vwm_catasto2_old ALTER COLUMN task_id OPTIONS (
    column_name 'task_id'
);


ALTER FOREIGN TABLE catasto.vwm_catasto2_old OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 29854)
-- Name: confine; Type: TABLE; Schema: gis_data; Owner: postgres
--

CREATE TABLE gis_data.confine (
    gid smallint NOT NULL,
    geom public.geometry(MultiPolygon,32633),
    comune_nom character varying(254)
);


ALTER TABLE gis_data.confine OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 29868)
-- Name: no_background; Type: TABLE; Schema: gis_data; Owner: postgres
--

CREATE TABLE gis_data.no_background (
    geom public.geometry(MultiPolygon,4326),
    id integer NOT NULL
);


ALTER TABLE gis_data.no_background OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 29874)
-- Name: arco_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.arco_id_seq
    START WITH 800000000
    INCREMENT BY 1
    MINVALUE 800000000
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.arco_id_seq OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 29876)
-- Name: arco; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco (
    cod_arco integer DEFAULT nextval('grafo.arco_id_seq'::regclass) NOT NULL,
    cod_via integer,
    nodo_da integer,
    nodo_a integer,
    cod_via_da integer,
    cod_via_a integer,
    prog_x_via integer,
    mt_da integer,
    mt_a integer,
    data_ini date,
    data_fine date,
    data_imm date,
    lunghezza double precision,
    larghezza double precision,
    superficie double precision,
    corsie smallint,
    testo character varying(255),
    localita character varying(255),
    civiminp integer,
    espominp character varying(16),
    civimaxp integer,
    espomaxp character varying(16),
    civimind integer,
    espomind character varying(16),
    civimaxd integer,
    espomaxd character varying(16),
    estr_verif boolean,
    cresciv smallint,
    id_uso smallint,
    id_classe smallint,
    id_tipo smallint,
    id_sede smallint,
    id_livello smallint,
    id_paviment smallint,
    id_portata smallint,
    id_stato_cons smallint,
    id_sezione smallint,
    id_tipologia smallint,
    id_funzionalita smallint,
    id_tipo_lim_amm smallint,
    id_class_funz character varying(1),
    id_fondo smallint,
    id_carreggiata smallint,
    id_marcia smallint,
    id_stato_esercizio smallint,
    id_origine smallint,
    id_fonte smallint,
    data_ult_man date,
    data_ri_mappa date,
    ora_vari character varying(8),
    data_pros_int date,
    id_delib_denom integer,
    id_delib_propr integer,
    determ_valore double precision,
    senso_perc boolean,
    zigzag boolean,
    acqued boolean,
    gasdot boolean,
    telefoni boolean,
    elettr boolean,
    fogne_bianche boolean,
    fogne_nere boolean,
    scolina boolean,
    operedarte boolean,
    guardrail boolean,
    centro_edif boolean,
    segnaletica_vert boolean,
    segnaletica_oriz boolean,
    pista_cicl boolean,
    marciapiede boolean,
    id_viabilita smallint,
    id_fondazione smallint,
    id_corpi_illum integer,
    id_stra_cs smallint,
    id_proprieta smallint,
    id_senso_percorrenza smallint,
    id_fondaz_1 integer,
    prof_fondaz_1 integer,
    id_fondaz_2 integer,
    prof_fondaz_2 integer,
    id_fondaz_3 integer,
    prof_fondaz_3 integer,
    id_fondaz_4 integer,
    prof_fondaz_4 integer,
    prev_arco integer,
    prev_arco_suppl integer,
    geom public.geometry(LineString,32633),
    id_quart_pari character varying(32),
    id_quart_disp character varying(32),
    id_muni_pari character varying(32),
    id_muni_disp character varying(32)
);


ALTER TABLE grafo.arco OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 29883)
-- Name: arco_carreggiata; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_carreggiata (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_carreggiata OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 29886)
-- Name: arco_class_funz; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_class_funz (
    id character varying(1) NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_class_funz OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 29889)
-- Name: arco_classe; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_classe (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_classe OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 29892)
-- Name: arco_fondazione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_fondazione (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_fondazione OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 29895)
-- Name: arco_fondo; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_fondo (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_fondo OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 29898)
-- Name: arco_fonte; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_fonte (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_fonte OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 29901)
-- Name: arco_funzionalita; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_funzionalita (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_funzionalita OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 29904)
-- Name: arco_livello; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_livello (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_livello OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 29907)
-- Name: arco_marcia; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_marcia (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_marcia OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 29910)
-- Name: arco_mot_ridenominazione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_mot_ridenominazione (
    id integer NOT NULL,
    name character varying(128) NOT NULL
);


ALTER TABLE grafo.arco_mot_ridenominazione OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 29913)
-- Name: arco_mot_ridenominazione_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.arco_mot_ridenominazione_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.arco_mot_ridenominazione_id_seq OWNER TO postgres;

--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 239
-- Name: arco_mot_ridenominazione_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.arco_mot_ridenominazione_id_seq OWNED BY grafo.arco_mot_ridenominazione.id;


--
-- TOC entry 240 (class 1259 OID 29915)
-- Name: arco_origine; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_origine (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_origine OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 29918)
-- Name: arco_pavimentazione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_pavimentazione (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_pavimentazione OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 29921)
-- Name: arco_portata; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_portata (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_portata OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 29924)
-- Name: arco_proprieta; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_proprieta (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_proprieta OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 29927)
-- Name: arco_sede; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_sede (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_sede OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 29930)
-- Name: arco_senso_percorrenza; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_senso_percorrenza (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_senso_percorrenza OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 29933)
-- Name: arco_sezione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_sezione (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_sezione OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 29936)
-- Name: arco_stato_cons; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_stato_cons (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_stato_cons OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 29939)
-- Name: arco_stato_esercizio; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_stato_esercizio (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_stato_esercizio OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 29942)
-- Name: arco_strada_cs; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_strada_cs (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_strada_cs OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 29945)
-- Name: arco_tipo; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_tipo (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_tipo OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 29948)
-- Name: arco_tipologia; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_tipologia (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_tipologia OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 29951)
-- Name: arco_uso; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_uso (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_uso OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 29954)
-- Name: arco_viabilita; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.arco_viabilita (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.arco_viabilita OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 29957)
-- Name: civico_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.civico_id_seq
    START WITH 800000000
    INCREMENT BY 1
    MINVALUE 800000000
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.civico_id_seq OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 29959)
-- Name: civico; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico (
    id integer DEFAULT nextval('grafo.civico_id_seq'::regclass) NOT NULL,
    id_civico_principale integer,
    cod_arco integer,
    cod_via integer NOT NULL,
    id_edificio integer[],
    numero integer NOT NULL,
    esponente character varying(12),
    cap integer,
    serv_rsu boolean,
    provvisorio boolean,
    tipo_ingr character varying(500),
    nota character varying(500),
    data_ini date,
    data_fine date,
    id_mot_cessazione smallint,
    prev_civico integer,
    x double precision,
    y double precision,
    geom public.geometry(Point,32633),
    targa_x double precision,
    targa_y double precision,
    targa_ang double precision,
    id_mot_inserimento smallint,
    data_ins_mappa date,
    data_ri_mappa date,
    id_tipo_ingresso smallint,
    carrabile boolean,
    accesso_multiplo boolean,
    proiezione_x double precision,
    proiezione_y double precision,
    id_lato_strada smallint,
    principale boolean DEFAULT true,
    estensione character varying(128),
    data_inserimento date,
    numero_delib character varying(256)
);


ALTER TABLE grafo.civico OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 29967)
-- Name: civico_lato_strada; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico_lato_strada (
    id smallint NOT NULL,
    name character varying(32)
);


ALTER TABLE grafo.civico_lato_strada OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 29970)
-- Name: civico_mot_cessazione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico_mot_cessazione (
    id integer NOT NULL,
    name character varying(128) NOT NULL
);


ALTER TABLE grafo.civico_mot_cessazione OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 29973)
-- Name: civico_mot_cessazione_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.civico_mot_cessazione_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.civico_mot_cessazione_id_seq OWNER TO postgres;

--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 258
-- Name: civico_mot_cessazione_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.civico_mot_cessazione_id_seq OWNED BY grafo.civico_mot_cessazione.id;


--
-- TOC entry 259 (class 1259 OID 29975)
-- Name: civico_mot_inserimento; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico_mot_inserimento (
    id integer NOT NULL,
    name character varying(64) NOT NULL
);


ALTER TABLE grafo.civico_mot_inserimento OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 29978)
-- Name: civico_mot_inserimento_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.civico_mot_inserimento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.civico_mot_inserimento_id_seq OWNER TO postgres;

--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 260
-- Name: civico_mot_inserimento_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.civico_mot_inserimento_id_seq OWNED BY grafo.civico_mot_inserimento.id;


--
-- TOC entry 261 (class 1259 OID 29980)
-- Name: civico_particelle; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico_particelle (
    id_civico integer NOT NULL,
    sezione character varying(8),
    allegato character varying(8),
    foglio character varying(8) NOT NULL,
    numero character varying(8) NOT NULL
);


ALTER TABLE grafo.civico_particelle OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 29983)
-- Name: civico_tipo_ingresso; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico_tipo_ingresso (
    id integer NOT NULL,
    name character varying(64) NOT NULL
);


ALTER TABLE grafo.civico_tipo_ingresso OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 29986)
-- Name: civico_tipo_ingresso_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.civico_tipo_ingresso_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.civico_tipo_ingresso_id_seq OWNER TO postgres;

--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 263
-- Name: civico_tipo_ingresso_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.civico_tipo_ingresso_id_seq OWNED BY grafo.civico_tipo_ingresso.id;


--
-- TOC entry 264 (class 1259 OID 29988)
-- Name: trac_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.trac_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.trac_seq OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 29990)
-- Name: civico_trac; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico_trac (
    id integer DEFAULT nextval('grafo.trac_seq'::regclass) NOT NULL,
    tipo_op character varying(8),
    data_op timestamp with time zone DEFAULT now(),
    id_civico integer,
    cod_arco integer,
    cod_via integer,
    numero integer,
    esponente character varying(12),
    cap integer,
    x double precision,
    y double precision,
    principale boolean,
    provvisorio boolean,
    serv_rsu boolean,
    id_mot_inserimento integer,
    id_mot_cessazione integer,
    data_ini date,
    data_fine date,
    prev_civico integer,
    id_user integer,
    id_circoscrizione character varying(32),
    id_localita character varying(32)
);


ALTER TABLE grafo.civico_trac OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 29995)
-- Name: civico_zona; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.civico_zona (
    id_civico integer NOT NULL,
    id_zona character varying(32) NOT NULL
);


ALTER TABLE grafo.civico_zona OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 29998)
-- Name: via_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.via_id_seq
    START WITH 800000000
    INCREMENT BY 1
    MINVALUE 800000000
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.via_id_seq OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 30000)
-- Name: via; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.via (
    cod_via integer DEFAULT nextval('grafo.via_id_seq'::regclass) NOT NULL,
    id_tipo integer NOT NULL,
    denominazione character varying(100) NOT NULL,
    num_delib character varying(10),
    data_delib date,
    id_tipo_numero smallint,
    nota character varying(400),
    data_ini date,
    data_fine date,
    id_mot_cessazione smallint,
    prev_via integer,
    denom_breve character varying(60),
    id_classificazione integer,
    denom_pura character varying(50),
    sottotitolo character varying(150),
    descrizione_alt1 character varying(100),
    descrizione_alt2 character varying(25),
    descrizione_alt3 character varying(25),
    descrizione_alt4 character varying(100),
    descrizione_alt5 character varying(25),
    descrizione_alt6 character varying(25),
    data_verbale date,
    larghezza double precision,
    localita character varying(32)[],
    municipio character varying(32)[],
    data_inserimento date
);


ALTER TABLE grafo.via OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 30007)
-- Name: view_arco; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_arco AS
 SELECT a.cod_arco,
    a.cod_via,
    a.nodo_da,
    a.nodo_a,
    a.cod_via_da,
    a.cod_via_a,
    a.prog_x_via,
    a.mt_da,
    a.mt_a,
    a.data_ini,
    a.data_fine,
    a.data_imm,
    a.lunghezza,
    a.larghezza,
    a.superficie,
    a.corsie,
    a.testo,
    a.localita,
    even_numbers.civiminp,
    even_numbers.espominp,
    even_numbers.civimaxp,
    even_numbers.espomaxp,
    odd_numbers.civimind,
    odd_numbers.espomind,
    odd_numbers.civimaxd,
    odd_numbers.espomaxd,
    a.estr_verif,
    a.cresciv,
    a.id_quart_pari,
    a.id_quart_disp,
    a.id_muni_pari,
    a.id_muni_disp,
    a.id_uso,
    a.id_classe,
    a.id_tipo,
    a.id_sede,
    a.id_livello,
    a.id_paviment,
    a.id_portata,
    a.id_stato_cons,
    a.id_sezione,
    a.id_tipologia,
    a.id_funzionalita,
    a.id_tipo_lim_amm,
    a.id_class_funz,
    a.id_fondo,
    a.id_carreggiata,
    a.id_marcia,
    a.id_stato_esercizio,
    a.id_origine,
    a.id_fonte,
    a.data_ult_man,
    a.data_ri_mappa,
    a.ora_vari,
    a.data_pros_int,
    a.id_delib_denom,
    a.id_delib_propr,
    a.determ_valore,
    a.senso_perc,
    a.zigzag,
    a.acqued,
    a.gasdot,
    a.telefoni,
    a.elettr,
    a.fogne_bianche,
    a.fogne_nere,
    a.scolina,
    a.operedarte,
    a.guardrail,
    a.centro_edif,
    a.segnaletica_vert,
    a.segnaletica_oriz,
    a.pista_cicl,
    a.marciapiede,
    a.id_viabilita,
    a.id_fondazione,
    a.id_corpi_illum,
    a.id_stra_cs,
    a.id_proprieta,
    a.id_senso_percorrenza,
    a.id_fondaz_1,
    a.prof_fondaz_1,
    a.id_fondaz_2,
    a.prof_fondaz_2,
    a.id_fondaz_3,
    a.prof_fondaz_3,
    a.id_fondaz_4,
    a.prof_fondaz_4,
    a.prev_arco,
    a.prev_arco_suppl,
    a.geom,
    v.denominazione AS nome_via,
        CASE
            WHEN ((now() < a.data_fine) OR (a.data_fine IS NULL)) THEN true
            ELSE false
        END AS is_valid_now
   FROM (((grafo.arco a
     LEFT JOIN grafo.via v ON ((a.cod_via = v.cod_via)))
     LEFT JOIN ( SELECT c1.cod_arco,
            min(c1.numero) AS civiminp,
            ( SELECT (array_agg(c2.esponente ORDER BY c2.esponente NULLS FIRST))[1] AS array_agg
                   FROM grafo.civico c2
                  WHERE ((c1.cod_arco = c2.cod_arco) AND (c2.numero = min(c1.numero)))) AS espominp,
            max(c1.numero) AS civimaxp,
            ( SELECT (array_agg(c2.esponente ORDER BY c2.esponente DESC NULLS LAST))[1] AS array_agg
                   FROM grafo.civico c2
                  WHERE ((c1.cod_arco = c2.cod_arco) AND (c2.numero = max(c1.numero)))) AS espomaxp
           FROM grafo.civico c1
          WHERE (((c1.numero % 2) = 0) AND ((c1.data_fine IS NULL) OR (c1.data_fine > now())))
          GROUP BY c1.cod_arco
          ORDER BY c1.cod_arco) even_numbers ON ((a.cod_arco = even_numbers.cod_arco)))
     LEFT JOIN ( SELECT c1.cod_arco,
            min(c1.numero) AS civimind,
            ( SELECT (array_agg(c2.esponente ORDER BY c2.esponente NULLS FIRST))[1] AS array_agg
                   FROM grafo.civico c2
                  WHERE ((c1.cod_arco = c2.cod_arco) AND (c2.numero = min(c1.numero)))) AS espomind,
            max(c1.numero) AS civimaxd,
            ( SELECT (array_agg(c2.esponente ORDER BY c2.esponente DESC NULLS LAST))[1] AS array_agg
                   FROM grafo.civico c2
                  WHERE ((c1.cod_arco = c2.cod_arco) AND (c2.numero = max(c1.numero)))) AS espomaxd
           FROM grafo.civico c1
          WHERE (((c1.numero % 2) = 1) AND ((c1.data_fine IS NULL) OR (c1.data_fine > now())))
          GROUP BY c1.cod_arco
          ORDER BY c1.cod_arco) odd_numbers ON ((a.cod_arco = odd_numbers.cod_arco)));


ALTER TABLE grafo.view_arco OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 30012)
-- Name: db_grafo_arco; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.db_grafo_arco AS
 SELECT view_arco.cod_arco,
    view_arco.cod_via,
    view_arco.nodo_da AS nodo1,
    view_arco.nodo_a AS nodo2,
    view_arco.geom,
    view_arco.cod_arco AS object_id,
    view_arco.nome_via AS denominazi,
    view_arco.lunghezza,
        CASE
            WHEN ((view_arco.id_quart_pari)::text = '1|BARI'::text) THEN 1
            WHEN ((view_arco.id_quart_pari)::text = '1|TORRE A MARE'::text) THEN 2
            WHEN ((view_arco.id_quart_pari)::text = '1|SANTO SPIRITO'::text) THEN 3
            WHEN ((view_arco.id_quart_pari)::text = '1|PALESE'::text) THEN 4
            WHEN ((view_arco.id_quart_pari)::text = '1|CARBONARA'::text) THEN 5
            WHEN ((view_arco.id_quart_pari)::text = '1|LOSETO'::text) THEN 6
            WHEN ((view_arco.id_quart_pari)::text = '1|CEGLIE DEL CAMPO'::text) THEN 7
            ELSE NULL::integer
        END AS id_quart_pari,
    "substring"((view_arco.id_quart_pari)::text, 3) AS quartiere_pari,
        CASE
            WHEN ((view_arco.id_quart_disp)::text = '1|BARI'::text) THEN 1
            WHEN ((view_arco.id_quart_disp)::text = '1|TORRE A MARE'::text) THEN 2
            WHEN ((view_arco.id_quart_disp)::text = '1|SANTO SPIRITO'::text) THEN 3
            WHEN ((view_arco.id_quart_disp)::text = '1|PALESE'::text) THEN 4
            WHEN ((view_arco.id_quart_disp)::text = '1|CARBONARA'::text) THEN 5
            WHEN ((view_arco.id_quart_disp)::text = '1|LOSETO'::text) THEN 6
            WHEN ((view_arco.id_quart_disp)::text = '1|CEGLIE DEL CAMPO'::text) THEN 7
            ELSE NULL::integer
        END AS id_quart_disp,
    "substring"((view_arco.id_quart_disp)::text, 3) AS quartiere_dispari
   FROM grafo.view_arco
  WHERE (view_arco.is_valid_now IS TRUE);


ALTER TABLE grafo.db_grafo_arco OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 33600)
-- Name: view_civico; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_civico AS
SELECT
    NULL::integer AS id,
    NULL::integer AS id_civico_principale,
    NULL::integer AS cod_arco,
    NULL::integer AS cod_via,
    NULL::integer[] AS id_edificio,
    NULL::text AS id_edificio_str,
    NULL::integer AS numero,
    NULL::character varying(12) AS esponente,
    NULL::integer AS cap,
    NULL::boolean AS serv_rsu,
    NULL::boolean AS provvisorio,
    NULL::character varying(500) AS tipo_ingr,
    NULL::character varying(500) AS nota,
    NULL::date AS data_ini,
    NULL::date AS data_fine,
    NULL::date AS data_inserimento,
    NULL::character varying(256) AS numero_delib,
    NULL::smallint AS id_mot_cessazione,
    NULL::integer AS prev_civico,
    NULL::double precision AS x,
    NULL::double precision AS y,
    NULL::public.geometry(Point,32633) AS geom,
    NULL::double precision AS targa_x,
    NULL::double precision AS targa_y,
    NULL::double precision AS targa_ang,
    NULL::smallint AS id_mot_inserimento,
    NULL::date AS data_ins_mappa,
    NULL::date AS data_ri_mappa,
    NULL::smallint AS id_tipo_ingresso,
    NULL::boolean AS carrabile,
    NULL::boolean AS accesso_multiplo,
    NULL::double precision AS proiezione_x,
    NULL::double precision AS proiezione_y,
    NULL::smallint AS id_lato_strada,
    NULL::boolean AS principale,
    NULL::character varying(128) AS estensione,
    NULL::character varying(100) AS nome_via,
    NULL::character varying AS localita,
    NULL::character varying AS municipio,
    NULL::boolean AS is_valid_now;


ALTER TABLE grafo.view_civico OWNER TO postgres;

--
-- TOC entry 355 (class 1259 OID 33605)
-- Name: db_grafo_civico; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.db_grafo_civico AS
 SELECT view_civico.id,
    '01'::character varying(15) AS ente,
    view_civico.cod_via,
    view_civico.nome_via AS denom_via,
    view_civico.cod_arco,
    view_civico.geom,
    view_civico.id AS object_id,
    view_civico.numero,
    view_civico.esponente,
    (
        CASE
            WHEN (view_civico.esponente IS NULL) THEN ((view_civico.numero)::character varying(53))::text
            ELSE ((view_civico.numero || '/'::text) || (view_civico.esponente)::text)
        END)::character varying(53) AS ncivsub,
    (view_civico.principale)::integer AS principale,
    (view_civico.provvisorio)::integer AS provvisorio,
    to_char((view_civico.data_ini)::timestamp with time zone, 'yyyymmdd'::text) AS data_istituzione,
    ''::character varying(18) AS civkey,
    view_civico.id_edificio
   FROM grafo.view_civico
  WHERE (view_civico.is_valid_now IS TRUE);


ALTER TABLE grafo.db_grafo_civico OWNER TO postgres;

--
-- TOC entry 365 (class 1259 OID 35323)
-- Name: db_grafo_civico_v2; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.db_grafo_civico_v2 AS
 SELECT view_civico.id,
    '01'::character varying(15) AS ente,
    view_civico.cod_via,
    view_civico.nome_via AS denom_via,
    view_civico.cod_arco,
    view_civico.geom,
    view_civico.id AS object_id,
    view_civico.numero,
    view_civico.esponente,
    view_civico.estensione,
    (
        CASE
            WHEN (view_civico.esponente IS NULL) THEN ((view_civico.numero)::character varying(53))::text
            ELSE ((view_civico.numero || '/'::text) || (view_civico.esponente)::text)
        END)::character varying(53) AS ncivsub,
    (view_civico.principale)::integer AS principale,
    (view_civico.provvisorio)::integer AS provvisorio,
    to_char((view_civico.data_ini)::timestamp with time zone, 'yyyymmdd'::text) AS data_istituzione,
    ''::character varying(18) AS civkey,
    view_civico.id_edificio
   FROM grafo.view_civico
  WHERE (view_civico.is_valid_now IS TRUE);


ALTER TABLE grafo.db_grafo_civico_v2 OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 30027)
-- Name: edificio_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.edificio_id_seq
    START WITH 800000000
    INCREMENT BY 1
    MINVALUE 800000000
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.edificio_id_seq OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 30029)
-- Name: edificio; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.edificio (
    id integer DEFAULT nextval('grafo.edificio_id_seq'::regclass) NOT NULL,
    id_stato integer NOT NULL,
    id_tipo integer,
    id_uso_prevalente integer,
    qualita_uso_prevalente smallint,
    anno_costr smallint,
    qualita_anno_costr smallint,
    cod_comune character varying(4),
    sezione character varying(1),
    foglio character varying(4),
    numero character varying(5),
    denominatore smallint,
    edificialita character varying(1),
    denominazione character varying(512),
    ppi_anno smallint,
    ppi_numero character varying(10),
    ppi_qualita smallint,
    ac_anno smallint,
    ac_numero character varying(10),
    data_ins_mappa date,
    id_diff_catasto smallint,
    lnba integer,
    lnba_qualita smallint,
    data_ri_mappa date,
    sezione_urbana character varying(3),
    geom public.geometry(MultiPolygon,32633),
    data_ini date,
    data_fine date,
    id_mot_cessazione smallint,
    sotterraneo boolean
);


ALTER TABLE grafo.edificio OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 30036)
-- Name: edificio_stato; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.edificio_stato (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.edificio_stato OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 30039)
-- Name: edificio_tipo; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.edificio_tipo (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.edificio_tipo OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 30042)
-- Name: edificio_uso_prevalente; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.edificio_uso_prevalente (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.edificio_uso_prevalente OWNER TO postgres;

--
-- TOC entry 299 (class 1259 OID 30126)
-- Name: view_edificio; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_edificio AS
 SELECT e.id,
    e.id_stato,
    e.id_tipo,
    e.id_uso_prevalente,
    e.qualita_uso_prevalente,
    e.anno_costr,
    e.qualita_anno_costr,
    e.cod_comune,
    e.sezione,
    e.foglio,
    e.numero,
    e.denominatore,
    e.edificialita,
    e.denominazione,
    e.ppi_anno,
    e.ppi_numero,
    e.ppi_qualita,
    e.ac_anno,
    e.ac_numero,
    e.data_ins_mappa,
    e.id_diff_catasto,
    e.lnba,
    e.lnba_qualita,
    e.data_ri_mappa,
    e.sezione_urbana,
    e.geom,
    e.data_ini,
    e.data_fine,
    e.id_mot_cessazione,
    e.sotterraneo,
        CASE
            WHEN ((now() < e.data_fine) OR (e.data_fine IS NULL)) THEN true
            ELSE false
        END AS is_valid_now
   FROM grafo.edificio e;


ALTER TABLE grafo.view_edificio OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 30045)
-- Name: db_grafo_edificio; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.db_grafo_edificio AS
 SELECT ve.id AS id_oe,
    '01'::character varying(15) AS ente,
    ve.id,
    ve.geom,
    ve.id AS object_id,
    ve.id_stato,
    (es.name)::character varying(100) AS stato,
    ve.id_tipo,
    (et.name)::character varying(500) AS tipo,
    ve.id_uso_prevalente AS id_uso_prev,
    (eup.name)::character varying(500) AS uso_preval,
    (ve.anno_costr)::character(4) AS anno_costr
   FROM (((grafo.view_edificio ve
     LEFT JOIN grafo.edificio_stato es ON ((ve.id_stato = es.id)))
     LEFT JOIN grafo.edificio_tipo et ON ((ve.id_tipo = et.id)))
     LEFT JOIN grafo.edificio_uso_prevalente eup ON ((ve.id_uso_prevalente = eup.id)))
  WHERE (ve.is_valid_now IS TRUE);


ALTER TABLE grafo.db_grafo_edificio OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 30050)
-- Name: edificio_diff_catasto; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.edificio_diff_catasto (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.edificio_diff_catasto OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 30053)
-- Name: edificio_mot_cessazione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.edificio_mot_cessazione (
    id integer NOT NULL,
    name character varying(64) NOT NULL
);


ALTER TABLE grafo.edificio_mot_cessazione OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 30056)
-- Name: edificio_mot_cessazione_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.edificio_mot_cessazione_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.edificio_mot_cessazione_id_seq OWNER TO postgres;

--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 279
-- Name: edificio_mot_cessazione_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.edificio_mot_cessazione_id_seq OWNED BY grafo.edificio_mot_cessazione.id;


--
-- TOC entry 280 (class 1259 OID 30058)
-- Name: log; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.log (
    id integer NOT NULL,
    date timestamp with time zone DEFAULT now(),
    user_id integer,
    entity character varying(32) NOT NULL,
    entity_id integer NOT NULL,
    operation character varying(128) NOT NULL,
    change json[]
);


ALTER TABLE grafo.log OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 30065)
-- Name: log_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.log_id_seq OWNER TO postgres;

--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 281
-- Name: log_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.log_id_seq OWNED BY grafo.log.id;


--
-- TOC entry 282 (class 1259 OID 30067)
-- Name: nodo_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.nodo_id_seq
    START WITH 800000001
    INCREMENT BY 1
    MINVALUE 800000000
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.nodo_id_seq OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 30069)
-- Name: nodo; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.nodo (
    id integer DEFAULT nextval('grafo.nodo_id_seq'::regclass) NOT NULL,
    id_tipo integer,
    id_tipo_lim_amm integer,
    toponomastica boolean,
    nota character varying(255),
    data_ini date,
    data_fine date,
    geom public.geometry(Point,32633)
);


ALTER TABLE grafo.nodo OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 30076)
-- Name: nodo_tipo; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.nodo_tipo (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.nodo_tipo OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 30079)
-- Name: quartieri; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.quartieri (
    gid integer NOT NULL,
    geom public.geometry(MultiPolygon,32633),
    objectid numeric,
    id numeric,
    nome character varying(50),
    pchiave integer
);


ALTER TABLE grafo.quartieri OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 30085)
-- Name: quartieri_gid_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.quartieri_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.quartieri_gid_seq OWNER TO postgres;

--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 286
-- Name: quartieri_gid_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.quartieri_gid_seq OWNED BY grafo.quartieri.gid;


--
-- TOC entry 287 (class 1259 OID 30087)
-- Name: tipo_lim_amm; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.tipo_lim_amm (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE grafo.tipo_lim_amm OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 30090)
-- Name: via_classificazione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.via_classificazione (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE grafo.via_classificazione OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 30093)
-- Name: via_classificazione_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.via_classificazione_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.via_classificazione_id_seq OWNER TO postgres;

--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 289
-- Name: via_classificazione_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.via_classificazione_id_seq OWNED BY grafo.via_classificazione.id;


--
-- TOC entry 290 (class 1259 OID 30095)
-- Name: via_mot_cessazione; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.via_mot_cessazione (
    id integer NOT NULL,
    name character varying(500) NOT NULL
);


ALTER TABLE grafo.via_mot_cessazione OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 30098)
-- Name: via_mot_cessazione_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.via_mot_cessazione_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.via_mot_cessazione_id_seq OWNER TO postgres;

--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 291
-- Name: via_mot_cessazione_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.via_mot_cessazione_id_seq OWNED BY grafo.via_mot_cessazione.id;


--
-- TOC entry 292 (class 1259 OID 30100)
-- Name: via_tipo; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.via_tipo (
    id integer NOT NULL,
    name character varying(500) NOT NULL
);


ALTER TABLE grafo.via_tipo OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 30103)
-- Name: via_tipo_id_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.via_tipo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.via_tipo_id_seq OWNER TO postgres;

--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 293
-- Name: via_tipo_id_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.via_tipo_id_seq OWNED BY grafo.via_tipo.id;


--
-- TOC entry 294 (class 1259 OID 30105)
-- Name: via_tipo_numero; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.via_tipo_numero (
    id smallint NOT NULL,
    name character varying(32) NOT NULL
);


ALTER TABLE grafo.via_tipo_numero OWNER TO postgres;

--
-- TOC entry 295 (class 1259 OID 30108)
-- Name: via_trac; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.via_trac (
    id integer DEFAULT nextval('grafo.trac_seq'::regclass) NOT NULL,
    tipo_op character varying(8),
    data_op timestamp with time zone DEFAULT now(),
    cod_via integer,
    denominazione character varying(100),
    denom_pura character varying(50),
    id_tipo integer,
    id_mot_cessazione integer,
    data_ini date,
    data_fine date,
    prev_via integer,
    id_user integer,
    prev_denominazione character varying(100),
    prev_denom_pura character varying(100)
);


ALTER TABLE grafo.via_trac OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 30113)
-- Name: zona; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.zona (
    gid integer NOT NULL,
    valore character varying(254),
    descr character varying(254),
    id_tipo smallint,
    geom public.geometry(MultiPolygon,32633),
    id character varying(32) NOT NULL,
    ws_value character varying(32)
);


ALTER TABLE grafo.zona OWNER TO postgres;

--
-- TOC entry 297 (class 1259 OID 30119)
-- Name: zona_tipo; Type: TABLE; Schema: grafo; Owner: postgres
--

CREATE TABLE grafo.zona_tipo (
    name character varying(32),
    descr character varying(256),
    modalita smallint,
    id smallint NOT NULL
);


ALTER TABLE grafo.zona_tipo OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 30122)
-- Name: view_civico_zona; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_civico_zona AS
 SELECT cz.id_civico,
    cz.id_zona,
    zt.name,
    zt.descr,
    z.valore
   FROM ((grafo.civico_zona cz
     LEFT JOIN grafo.zona z ON (((cz.id_zona)::text = (z.id)::text)))
     LEFT JOIN grafo.zona_tipo zt ON ((z.id_tipo = zt.id)));


ALTER TABLE grafo.view_civico_zona OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 30131)
-- Name: view_localita; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_localita AS
 SELECT zona.id,
    zona.valore AS name
   FROM grafo.zona
  WHERE (zona.id_tipo = 1);


ALTER TABLE grafo.view_localita OWNER TO postgres;

--
-- TOC entry 301 (class 1259 OID 30135)
-- Name: view_municipio; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_municipio AS
 SELECT zona.id,
    zona.valore AS name
   FROM grafo.zona
  WHERE (zona.id_tipo = 2);


ALTER TABLE grafo.view_municipio OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 30139)
-- Name: view_nodo; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_nodo AS
 SELECT n.id,
    n.id_tipo,
    nt.name AS tipo,
    n.id_tipo_lim_amm,
    tla.name AS tipo_lim_amm,
    n.toponomastica,
    n.nota,
    n.data_ini,
    n.data_fine,
    n.geom,
        CASE
            WHEN ((now() < n.data_fine) OR (n.data_fine IS NULL)) THEN true
            ELSE false
        END AS is_valid_now
   FROM ((grafo.nodo n
     LEFT JOIN grafo.nodo_tipo nt ON ((n.id_tipo = nt.id)))
     LEFT JOIN grafo.tipo_lim_amm tla ON ((n.id_tipo_lim_amm = tla.id)));


ALTER TABLE grafo.view_nodo OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 30144)
-- Name: view_proiezione; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_proiezione AS
 SELECT c.id,
    c.id_civico_principale,
    c.cod_arco,
    c.cod_via,
    c.id_edificio,
    c.numero,
    c.esponente,
    c.data_ini,
    c.data_fine,
    c.proiezione_x,
    c.proiezione_y,
    c.id_lato_strada,
    c.estensione,
    v.denominazione AS nome_via,
    cz.valore AS localita,
    public.st_setsrid(public.st_makepoint(c.proiezione_x, c.proiezione_y), 32633) AS geom,
        CASE
            WHEN ((now() < c.data_fine) OR (c.data_fine IS NULL)) THEN true
            ELSE false
        END AS is_valid_now
   FROM ((grafo.civico c
     LEFT JOIN grafo.via v ON ((c.cod_via = v.cod_via)))
     LEFT JOIN ( SELECT civico_zona.id_civico,
            civico_zona.id_zona,
            zona.id_tipo,
            zona.valore
           FROM (grafo.civico_zona
             LEFT JOIN grafo.zona ON (((civico_zona.id_zona)::text = (zona.id)::text)))) cz ON (((c.id = cz.id_civico) AND (cz.id_tipo = 1))))
  WHERE (c.estensione IS NULL);


ALTER TABLE grafo.view_proiezione OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 30149)
-- Name: view_quartiere; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_quartiere AS
 SELECT zona.id,
    zona.descr AS name
   FROM grafo.zona
  WHERE (zona.id_tipo = 6);


ALTER TABLE grafo.view_quartiere OWNER TO postgres;

--
-- TOC entry 356 (class 1259 OID 33610)
-- Name: view_via; Type: VIEW; Schema: grafo; Owner: postgres
--

CREATE VIEW grafo.view_via AS
SELECT
    NULL::integer AS cod_via,
    NULL::integer AS id_tipo,
    NULL::character varying(100) AS denominazione,
    NULL::character varying(10) AS num_delib,
    NULL::date AS data_delib,
    NULL::smallint AS id_tipo_numero,
    NULL::character varying(400) AS nota,
    NULL::date AS data_ini,
    NULL::date AS data_fine,
    NULL::date AS data_inserimento,
    NULL::smallint AS id_mot_cessazione,
    NULL::integer AS prev_via,
    NULL::character varying(60) AS denom_breve,
    NULL::integer AS id_classificazione,
    NULL::character varying(50) AS denom_pura,
    NULL::character varying(150) AS sottotitolo,
    NULL::character varying(100) AS descrizione_alt1,
    NULL::character varying(25) AS descrizione_alt2,
    NULL::character varying(25) AS descrizione_alt3,
    NULL::character varying(100) AS descrizione_alt4,
    NULL::character varying(25) AS descrizione_alt5,
    NULL::character varying(25) AS descrizione_alt6,
    NULL::date AS data_verbale,
    NULL::double precision AS larghezza,
    NULL::character varying(32)[] AS localita,
    NULL::character varying(32)[] AS municipio,
    NULL::character varying[] AS localita_val,
    NULL::character varying[] AS municipio_val,
    NULL::bigint AS archi,
    NULL::double precision AS lunghezza,
    NULL::integer AS civiminp,
    NULL::integer AS civimaxp,
    NULL::integer AS civimind,
    NULL::integer AS civimaxd,
    NULL::public.box2d AS extent,
    NULL::boolean AS is_valid_now;


ALTER TABLE grafo.view_via OWNER TO postgres;

--
-- TOC entry 305 (class 1259 OID 30158)
-- Name: zona_gid_seq; Type: SEQUENCE; Schema: grafo; Owner: postgres
--

CREATE SEQUENCE grafo.zona_gid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE grafo.zona_gid_seq OWNER TO postgres;

--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 305
-- Name: zona_gid_seq; Type: SEQUENCE OWNED BY; Schema: grafo; Owner: postgres
--

ALTER SEQUENCE grafo.zona_gid_seq OWNED BY grafo.zona.gid;


--
-- TOC entry 306 (class 1259 OID 30160)
-- Name: ctx_operator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ctx_operator (
    id character varying(8) NOT NULL,
    name character varying(32)
);


ALTER TABLE public.ctx_operator OWNER TO postgres;

--
-- TOC entry 307 (class 1259 OID 30163)
-- Name: event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event (
    id integer NOT NULL,
    group_id integer,
    type_id smallint NOT NULL,
    status_id smallint DEFAULT 0 NOT NULL,
    source character varying(64),
    message character varying(128),
    date timestamp with time zone DEFAULT now(),
    detail json,
    lat double precision,
    lon double precision,
    show_timeline smallint
);


ALTER TABLE public.event OWNER TO postgres;

--
-- TOC entry 308 (class 1259 OID 30171)
-- Name: event_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.event_id_seq OWNER TO postgres;

--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 308
-- Name: event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_id_seq OWNED BY public.event.id;


--
-- TOC entry 309 (class 1259 OID 30173)
-- Name: event_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_type (
    id integer NOT NULL,
    name character varying,
    descr character varying
);


ALTER TABLE public.event_type OWNER TO postgres;

--
-- TOC entry 310 (class 1259 OID 30179)
-- Name: event_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.event_type_id_seq OWNER TO postgres;

--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 310
-- Name: event_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_type_id_seq OWNED BY public.event_type.id;


--
-- TOC entry 311 (class 1259 OID 30181)
-- Name: event_type_permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_type_permission (
    event_type_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.event_type_permission OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 30184)
-- Name: i18n; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.i18n (
    id integer NOT NULL,
    object_key character varying(64),
    parent_id integer,
    depth smallint
);


ALTER TABLE public.i18n OWNER TO postgres;

--
-- TOC entry 313 (class 1259 OID 30187)
-- Name: i18n_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.i18n_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.i18n_id_seq OWNER TO postgres;

--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 313
-- Name: i18n_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.i18n_id_seq OWNED BY public.i18n.id;


--
-- TOC entry 314 (class 1259 OID 30189)
-- Name: i18n_string; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.i18n_string (
    id integer NOT NULL,
    object_id integer NOT NULL,
    label_key character varying(64),
    it character varying(256) DEFAULT ''::character varying,
    en character varying(256) DEFAULT ''::character varying
);


ALTER TABLE public.i18n_string OWNER TO postgres;

--
-- TOC entry 315 (class 1259 OID 30197)
-- Name: i18n_string_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.i18n_string_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.i18n_string_id_seq OWNER TO postgres;

--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 315
-- Name: i18n_string_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.i18n_string_id_seq OWNED BY public.i18n_string.id;


--
-- TOC entry 358 (class 1259 OID 33621)
-- Name: macro aree; Type: TABLE; Schema: public; Owner: user_stretor
--

CREATE TABLE public."macro aree" (
    gid integer NOT NULL,
    id integer,
    "macro area" character varying(15),
    pap character varying(100),
    geom public.geometry(MultiPolygon,32633)
);


ALTER TABLE public."macro aree" OWNER TO user_stretor;

--
-- TOC entry 357 (class 1259 OID 33619)
-- Name: macro aree_gid_seq; Type: SEQUENCE; Schema: public; Owner: user_stretor
--

CREATE SEQUENCE public."macro aree_gid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."macro aree_gid_seq" OWNER TO user_stretor;

--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 357
-- Name: macro aree_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user_stretor
--

ALTER SEQUENCE public."macro aree_gid_seq" OWNED BY public."macro aree".gid;


--
-- TOC entry 316 (class 1259 OID 30199)
-- Name: menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu (
    id integer NOT NULL,
    label character varying(128),
    enabled boolean,
    "position" integer,
    image character varying(256)
);


ALTER TABLE public.menu OWNER TO postgres;

--
-- TOC entry 317 (class 1259 OID 30202)
-- Name: menu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.menu_id_seq OWNER TO postgres;

--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 317
-- Name: menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_id_seq OWNED BY public.menu.id;


--
-- TOC entry 318 (class 1259 OID 30204)
-- Name: menu_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_item (
    id integer NOT NULL,
    id_group integer,
    label character varying(128),
    tooltip character varying(128),
    image character varying(128),
    app_name character varying(128),
    action character varying(128),
    params character varying(128),
    shortcut boolean,
    "position" integer
);


ALTER TABLE public.menu_item OWNER TO postgres;

--
-- TOC entry 319 (class 1259 OID 30210)
-- Name: menu_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.menu_item_id_seq OWNER TO postgres;

--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 319
-- Name: menu_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_item_id_seq OWNED BY public.menu_item.id;


--
-- TOC entry 364 (class 1259 OID 33696)
-- Name: pap; Type: TABLE; Schema: public; Owner: user_stretor
--

CREATE TABLE public.pap (
    gid integer NOT NULL,
    id integer,
    "macro area" character varying(15),
    pap character varying(100),
    geom public.geometry(MultiPolygon,32633)
);


ALTER TABLE public.pap OWNER TO user_stretor;

--
-- TOC entry 363 (class 1259 OID 33694)
-- Name: pap_gid_seq; Type: SEQUENCE; Schema: public; Owner: user_stretor
--

CREATE SEQUENCE public.pap_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pap_gid_seq OWNER TO user_stretor;

--
-- TOC entry 5351 (class 0 OID 0)
-- Dependencies: 363
-- Name: pap_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user_stretor
--

ALTER SEQUENCE public.pap_gid_seq OWNED BY public.pap.gid;


--
-- TOC entry 320 (class 1259 OID 30212)
-- Name: permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission (
    id integer NOT NULL,
    name character varying(64) NOT NULL,
    description character varying(128) NOT NULL,
    app_name character varying(32) NOT NULL,
    app_desc character varying(64) NOT NULL,
    menu_item_id integer
);


ALTER TABLE public.permission OWNER TO postgres;

--
-- TOC entry 321 (class 1259 OID 30215)
-- Name: permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permission_id_seq OWNER TO postgres;

--
-- TOC entry 5352 (class 0 OID 0)
-- Dependencies: 321
-- Name: permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permission_id_seq OWNED BY public.permission.id;


--
-- TOC entry 322 (class 1259 OID 30217)
-- Name: permission_role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission_role (
    permission_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.permission_role OWNER TO postgres;

--
-- TOC entry 360 (class 1259 OID 33649)
-- Name: quartieri; Type: TABLE; Schema: public; Owner: user_stretor
--

CREATE TABLE public.quartieri (
    gid integer NOT NULL,
    objectid bigint,
    id integer,
    nome character varying(50),
    geom public.geometry(MultiPolygon,32633)
);


ALTER TABLE public.quartieri OWNER TO user_stretor;

--
-- TOC entry 359 (class 1259 OID 33647)
-- Name: quartieri_gid_seq; Type: SEQUENCE; Schema: public; Owner: user_stretor
--

CREATE SEQUENCE public.quartieri_gid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.quartieri_gid_seq OWNER TO user_stretor;

--
-- TOC entry 5353 (class 0 OID 0)
-- Dependencies: 359
-- Name: quartieri_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user_stretor
--

ALTER SEQUENCE public.quartieri_gid_seq OWNED BY public.quartieri.gid;


--
-- TOC entry 323 (class 1259 OID 30220)
-- Name: role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role (
    id integer NOT NULL,
    descr character varying(128),
    name character varying(32),
    deleted boolean DEFAULT false,
    creation_date timestamp with time zone DEFAULT now(),
    remove_date timestamp with time zone,
    readonly boolean DEFAULT false
);


ALTER TABLE public.role OWNER TO postgres;

--
-- TOC entry 324 (class 1259 OID 30226)
-- Name: role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.role_id_seq OWNER TO postgres;

--
-- TOC entry 5354 (class 0 OID 0)
-- Dependencies: 324
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_id_seq OWNED BY public.role.id;


--
-- TOC entry 325 (class 1259 OID 30228)
-- Name: role_sysuser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_sysuser (
    role_id integer NOT NULL,
    sysuser_id integer NOT NULL
);


ALTER TABLE public.role_sysuser OWNER TO postgres;

--
-- TOC entry 326 (class 1259 OID 30231)
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    id integer NOT NULL,
    sysuser_id integer,
    token character varying(32),
    last_access_date timestamp with time zone,
    login_date timestamp with time zone,
    expiration_date timestamp with time zone
);


ALTER TABLE public.session OWNER TO postgres;

--
-- TOC entry 327 (class 1259 OID 30234)
-- Name: session_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.session_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.session_id_seq OWNER TO postgres;

--
-- TOC entry 5355 (class 0 OID 0)
-- Dependencies: 327
-- Name: session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.session_id_seq OWNED BY public.session.id;


--
-- TOC entry 328 (class 1259 OID 30236)
-- Name: sysuser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sysuser (
    id integer NOT NULL,
    name character varying(50),
    surname character varying(50),
    phone character varying(50),
    signature character varying(32),
    email character varying(50),
    deleted boolean DEFAULT false,
    username character varying(16),
    creation_date timestamp with time zone DEFAULT now(),
    remove_date timestamp with time zone,
    enabled boolean DEFAULT true,
    wso2_username character varying
);


ALTER TABLE public.sysuser OWNER TO postgres;

--
-- TOC entry 329 (class 1259 OID 30245)
-- Name: sysuser_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sysuser_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sysuser_id_seq OWNER TO postgres;

--
-- TOC entry 5356 (class 0 OID 0)
-- Dependencies: 329
-- Name: sysuser_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sysuser_id_seq OWNED BY public.sysuser.id;


--
-- TOC entry 330 (class 1259 OID 30247)
-- Name: user_layer_style; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_layer_style (
    id integer NOT NULL,
    user_id integer NOT NULL,
    layer_id integer NOT NULL,
    style json
);


ALTER TABLE public.user_layer_style OWNER TO postgres;

--
-- TOC entry 331 (class 1259 OID 30253)
-- Name: user_layer_style_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_layer_style_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_layer_style_id_seq OWNER TO postgres;

--
-- TOC entry 5357 (class 0 OID 0)
-- Dependencies: 331
-- Name: user_layer_style_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_layer_style_id_seq OWNED BY public.user_layer_style.id;


--
-- TOC entry 332 (class 1259 OID 30255)
-- Name: view_event; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_event AS
 SELECT e.id,
    e.group_id,
    e.type_id,
    e.status_id,
    e.source,
    e.message,
    e.date,
    e.detail,
    e.lat,
    e.lon,
    e.show_timeline,
    et.name AS type,
    et.descr AS type_descr
   FROM (public.event e
     LEFT JOIN public.event_type et ON ((e.type_id = et.id)));


ALTER TABLE public.view_event OWNER TO postgres;

--
-- TOC entry 333 (class 1259 OID 30259)
-- Name: view_sysuser; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_sysuser AS
 SELECT su.id,
    su.name,
    su.surname,
    su.username,
    su.phone,
    su.email,
    su.signature AS password,
    su.creation_date,
    su.enabled,
    su.wso2_username
   FROM public.sysuser su
  WHERE (su.deleted = false);


ALTER TABLE public.view_sysuser OWNER TO postgres;

--
-- TOC entry 334 (class 1259 OID 30263)
-- Name: wg_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_category (
    id integer NOT NULL,
    label character varying(64) NOT NULL,
    _position smallint,
    manageable boolean DEFAULT true,
    permission character varying(64)
);


ALTER TABLE public.wg_category OWNER TO postgres;

--
-- TOC entry 335 (class 1259 OID 30267)
-- Name: view_wg_category; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_wg_category AS
 SELECT c.id,
    c.label,
    c._position,
    c.manageable,
    c.permission,
    p.description AS permission_descr
   FROM (public.wg_category c
     LEFT JOIN public.permission p ON (((c.permission)::text = (p.name)::text)));


ALTER TABLE public.view_wg_category OWNER TO postgres;

--
-- TOC entry 336 (class 1259 OID 30271)
-- Name: wg_layer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_layer (
    id integer NOT NULL,
    id_category integer NOT NULL,
    id_parent integer,
    id_server smallint,
    depth smallint NOT NULL,
    _position smallint,
    label character varying(64) NOT NULL,
    layer_name character varying(64),
    tiled boolean,
    visible boolean,
    transparent boolean,
    url character varying(256),
    service character varying(8),
    version character varying(8),
    projection character varying(32),
    min_scale integer,
    max_scale integer,
    extent double precision[],
    permission character varying(64),
    id_field character varying(32),
    geometry_field json,
    style json,
    filter json,
    attributes json,
    cluster boolean,
    cluster_style json,
    image_param json,
    dynamic_filter boolean,
    advanced_query boolean,
    upgradable character varying[],
    id_type smallint,
    editable boolean,
    key character varying(32),
    info_format character varying(64)
);


ALTER TABLE public.wg_layer OWNER TO postgres;

--
-- TOC entry 5358 (class 0 OID 0)
-- Dependencies: 336
-- Name: COLUMN wg_layer.key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.wg_layer.key IS 'Unique key used to identify layer in source code. It must be set by hand.';


--
-- TOC entry 337 (class 1259 OID 30277)
-- Name: view_wg_layer; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.view_wg_layer AS
 SELECT l.id,
    l.id_category,
    l.id_parent,
    l.id_server,
    l.id_type,
    l.depth,
    l._position,
    l.label,
    l.layer_name,
    l.tiled,
    l.visible,
    l.transparent,
    l.url,
    l.service,
    l.version,
    l.projection,
    l.min_scale,
    l.max_scale,
    l.extent,
    l.permission,
    l.id_field,
    l.geometry_field,
    l.style,
    l.filter,
    l.attributes,
    l.cluster,
    l.cluster_style,
    l.image_param,
    l.dynamic_filter,
    l.advanced_query,
    l.upgradable,
    l.editable,
    l.info_format,
    l.key,
    p.description AS permission_descr
   FROM (public.wg_layer l
     LEFT JOIN public.permission p ON (((l.permission)::text = (p.name)::text)));


ALTER TABLE public.view_wg_layer OWNER TO postgres;

--
-- TOC entry 338 (class 1259 OID 30282)
-- Name: webgis_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.webgis_seq
    START WITH 10
    INCREMENT BY 1
    MINVALUE 10
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.webgis_seq OWNER TO postgres;

--
-- TOC entry 339 (class 1259 OID 30284)
-- Name: wg_base_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_base_map (
    id integer NOT NULL,
    label character varying(256) NOT NULL,
    image character varying,
    tiled boolean NOT NULL,
    _default boolean,
    _position smallint NOT NULL,
    permission character varying(64),
    print_not_reproject boolean DEFAULT false,
    service character varying(8),
    url character varying(256),
    layer_name character varying(128),
    projection character varying(32),
    transparent boolean,
    version character varying(8),
    id_server smallint NOT NULL
);


ALTER TABLE public.wg_base_map OWNER TO postgres;

--
-- TOC entry 5359 (class 0 OID 0)
-- Dependencies: 339
-- Name: COLUMN wg_base_map.image; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.wg_base_map.image IS 'base64 icon';


--
-- TOC entry 340 (class 1259 OID 30291)
-- Name: wg_geometry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_geometry (
    id character varying(128) NOT NULL,
    name character varying(32) NOT NULL
);


ALTER TABLE public.wg_geometry OWNER TO postgres;

--
-- TOC entry 341 (class 1259 OID 30294)
-- Name: wg_layer_attach; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_layer_attach (
    id integer NOT NULL,
    name character varying(128) NOT NULL,
    descr character varying(64),
    size integer,
    insert_date timestamp with time zone DEFAULT now(),
    entity_id integer NOT NULL
);


ALTER TABLE public.wg_layer_attach OWNER TO postgres;

--
-- TOC entry 342 (class 1259 OID 30298)
-- Name: wg_layer_attach_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wg_layer_attach_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wg_layer_attach_id_seq OWNER TO postgres;

--
-- TOC entry 5360 (class 0 OID 0)
-- Dependencies: 342
-- Name: wg_layer_attach_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wg_layer_attach_id_seq OWNED BY public.wg_layer_attach.id;


--
-- TOC entry 343 (class 1259 OID 30300)
-- Name: wg_layer_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_layer_type (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE public.wg_layer_type OWNER TO postgres;

--
-- TOC entry 344 (class 1259 OID 30303)
-- Name: wg_legend; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_legend (
    id integer NOT NULL,
    id_layer integer NOT NULL,
    label character varying(64),
    image character varying,
    extern boolean DEFAULT false
);


ALTER TABLE public.wg_legend OWNER TO postgres;

--
-- TOC entry 5361 (class 0 OID 0)
-- Dependencies: 344
-- Name: COLUMN wg_legend.image; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.wg_legend.image IS 'base64 icon';


--
-- TOC entry 345 (class 1259 OID 30310)
-- Name: wg_legend_class; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_legend_class (
    id integer NOT NULL,
    id_legend integer NOT NULL,
    name character varying(64) NOT NULL,
    image character varying,
    _position smallint
);


ALTER TABLE public.wg_legend_class OWNER TO postgres;

--
-- TOC entry 5362 (class 0 OID 0)
-- Dependencies: 345
-- Name: COLUMN wg_legend_class.image; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.wg_legend_class.image IS 'base64 icon';


--
-- TOC entry 346 (class 1259 OID 30316)
-- Name: wg_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_map (
    id smallint NOT NULL,
    map_name character varying(128),
    default_bbox double precision[],
    scales integer[],
    watermark character varying(255),
    point_zoom_level smallint,
    info_format character varying[],
    image_format json,
    vector_format json,
    mapserver json
);


ALTER TABLE public.wg_map OWNER TO postgres;

--
-- TOC entry 347 (class 1259 OID 30322)
-- Name: wg_map_rs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_map_rs (
    id smallint NOT NULL,
    name character varying(128),
    x_label character varying(32),
    y_label character varying(32),
    units character varying(32),
    prefix character varying(32),
    x_prefix character varying(32),
    y_prefix character varying(32),
    definition character varying(512),
    _default boolean DEFAULT false,
    code integer
);


ALTER TABLE public.wg_map_rs OWNER TO postgres;

--
-- TOC entry 348 (class 1259 OID 30329)
-- Name: wg_map_tools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_map_tools (
    id character varying(24) NOT NULL,
    tip character varying(32),
    class character varying(32),
    _position smallint,
    params json,
    permission character varying(64)
);


ALTER TABLE public.wg_map_tools OWNER TO postgres;

--
-- TOC entry 349 (class 1259 OID 30335)
-- Name: wg_server; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_server (
    id smallint NOT NULL,
    name character varying(64)
);


ALTER TABLE public.wg_server OWNER TO postgres;

--
-- TOC entry 350 (class 1259 OID 30338)
-- Name: wg_style_fill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_style_fill (
    id smallint NOT NULL,
    descr character varying(64),
    image character varying
);


ALTER TABLE public.wg_style_fill OWNER TO postgres;

--
-- TOC entry 351 (class 1259 OID 30344)
-- Name: wg_style_shape; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_style_shape (
    id smallint NOT NULL,
    descr character varying(64),
    image character varying
);


ALTER TABLE public.wg_style_shape OWNER TO postgres;

--
-- TOC entry 352 (class 1259 OID 30350)
-- Name: wg_style_stroke; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_style_stroke (
    id smallint NOT NULL,
    descr character varying(64),
    image character varying
);


ALTER TABLE public.wg_style_stroke OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 30356)
-- Name: wg_style_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wg_style_type (
    id character varying(32) NOT NULL,
    name character varying(64)
);


ALTER TABLE public.wg_style_type OWNER TO postgres;

--
-- TOC entry 362 (class 1259 OID 33668)
-- Name: zone spazzamento; Type: TABLE; Schema: public; Owner: user_stretor
--

CREATE TABLE public."zone spazzamento" (
    gid integer NOT NULL,
    id integer,
    "macro area" character varying(15),
    geom public.geometry(MultiPolygon,32633)
);


ALTER TABLE public."zone spazzamento" OWNER TO user_stretor;

--
-- TOC entry 361 (class 1259 OID 33666)
-- Name: zone spazzamento_gid_seq; Type: SEQUENCE; Schema: public; Owner: user_stretor
--

CREATE SEQUENCE public."zone spazzamento_gid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."zone spazzamento_gid_seq" OWNER TO user_stretor;

--
-- TOC entry 5363 (class 0 OID 0)
-- Dependencies: 361
-- Name: zone spazzamento_gid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user_stretor
--

ALTER SEQUENCE public."zone spazzamento_gid_seq" OWNED BY public."zone spazzamento".gid;


--
-- TOC entry 4825 (class 2604 OID 30360)
-- Name: arco_mot_ridenominazione id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_mot_ridenominazione ALTER COLUMN id SET DEFAULT nextval('grafo.arco_mot_ridenominazione_id_seq'::regclass);


--
-- TOC entry 4828 (class 2604 OID 30361)
-- Name: civico_mot_cessazione id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_mot_cessazione ALTER COLUMN id SET DEFAULT nextval('grafo.civico_mot_cessazione_id_seq'::regclass);


--
-- TOC entry 4829 (class 2604 OID 30362)
-- Name: civico_mot_inserimento id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_mot_inserimento ALTER COLUMN id SET DEFAULT nextval('grafo.civico_mot_inserimento_id_seq'::regclass);


--
-- TOC entry 4830 (class 2604 OID 30363)
-- Name: civico_tipo_ingresso id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_tipo_ingresso ALTER COLUMN id SET DEFAULT nextval('grafo.civico_tipo_ingresso_id_seq'::regclass);


--
-- TOC entry 4835 (class 2604 OID 30364)
-- Name: edificio_mot_cessazione id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio_mot_cessazione ALTER COLUMN id SET DEFAULT nextval('grafo.edificio_mot_cessazione_id_seq'::regclass);


--
-- TOC entry 4837 (class 2604 OID 30365)
-- Name: log id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.log ALTER COLUMN id SET DEFAULT nextval('grafo.log_id_seq'::regclass);


--
-- TOC entry 4839 (class 2604 OID 30366)
-- Name: quartieri gid; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.quartieri ALTER COLUMN gid SET DEFAULT nextval('grafo.quartieri_gid_seq'::regclass);


--
-- TOC entry 4840 (class 2604 OID 30367)
-- Name: via_classificazione id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_classificazione ALTER COLUMN id SET DEFAULT nextval('grafo.via_classificazione_id_seq'::regclass);


--
-- TOC entry 4841 (class 2604 OID 30368)
-- Name: via_mot_cessazione id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_mot_cessazione ALTER COLUMN id SET DEFAULT nextval('grafo.via_mot_cessazione_id_seq'::regclass);


--
-- TOC entry 4842 (class 2604 OID 30369)
-- Name: via_tipo id; Type: DEFAULT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_tipo ALTER COLUMN id SET DEFAULT nextval('grafo.via_tipo_id_seq'::regclass);


--
-- TOC entry 4847 (class 2604 OID 30370)
-- Name: event id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event ALTER COLUMN id SET DEFAULT nextval('public.event_id_seq'::regclass);


--
-- TOC entry 4848 (class 2604 OID 30371)
-- Name: event_type id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_type ALTER COLUMN id SET DEFAULT nextval('public.event_type_id_seq'::regclass);


--
-- TOC entry 4849 (class 2604 OID 30372)
-- Name: i18n id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n ALTER COLUMN id SET DEFAULT nextval('public.i18n_id_seq'::regclass);


--
-- TOC entry 4852 (class 2604 OID 30373)
-- Name: i18n_string id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_string ALTER COLUMN id SET DEFAULT nextval('public.i18n_string_id_seq'::regclass);


--
-- TOC entry 4872 (class 2604 OID 33624)
-- Name: macro aree gid; Type: DEFAULT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public."macro aree" ALTER COLUMN gid SET DEFAULT nextval('public."macro aree_gid_seq"'::regclass);


--
-- TOC entry 4853 (class 2604 OID 30374)
-- Name: menu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu ALTER COLUMN id SET DEFAULT nextval('public.menu_id_seq'::regclass);


--
-- TOC entry 4854 (class 2604 OID 30375)
-- Name: menu_item id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item ALTER COLUMN id SET DEFAULT nextval('public.menu_item_id_seq'::regclass);


--
-- TOC entry 4875 (class 2604 OID 33699)
-- Name: pap gid; Type: DEFAULT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public.pap ALTER COLUMN gid SET DEFAULT nextval('public.pap_gid_seq'::regclass);


--
-- TOC entry 4855 (class 2604 OID 30376)
-- Name: permission id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission ALTER COLUMN id SET DEFAULT nextval('public.permission_id_seq'::regclass);


--
-- TOC entry 4873 (class 2604 OID 33652)
-- Name: quartieri gid; Type: DEFAULT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public.quartieri ALTER COLUMN gid SET DEFAULT nextval('public.quartieri_gid_seq'::regclass);


--
-- TOC entry 4859 (class 2604 OID 30377)
-- Name: role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role ALTER COLUMN id SET DEFAULT nextval('public.role_id_seq'::regclass);


--
-- TOC entry 4860 (class 2604 OID 30378)
-- Name: session id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session ALTER COLUMN id SET DEFAULT nextval('public.session_id_seq'::regclass);


--
-- TOC entry 4864 (class 2604 OID 30379)
-- Name: sysuser id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sysuser ALTER COLUMN id SET DEFAULT nextval('public.sysuser_id_seq'::regclass);


--
-- TOC entry 4865 (class 2604 OID 30380)
-- Name: user_layer_style id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_layer_style ALTER COLUMN id SET DEFAULT nextval('public.user_layer_style_id_seq'::regclass);


--
-- TOC entry 4869 (class 2604 OID 30381)
-- Name: wg_layer_attach id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer_attach ALTER COLUMN id SET DEFAULT nextval('public.wg_layer_attach_id_seq'::regclass);


--
-- TOC entry 4874 (class 2604 OID 33671)
-- Name: zone spazzamento gid; Type: DEFAULT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public."zone spazzamento" ALTER COLUMN gid SET DEFAULT nextval('public."zone spazzamento_gid_seq"'::regclass);


--
-- TOC entry 4879 (class 2606 OID 30423)
-- Name: confine confine_pkey; Type: CONSTRAINT; Schema: gis_data; Owner: postgres
--

ALTER TABLE ONLY gis_data.confine
    ADD CONSTRAINT confine_pkey PRIMARY KEY (gid);


--
-- TOC entry 4882 (class 2606 OID 30427)
-- Name: no_background pk_no_background; Type: CONSTRAINT; Schema: gis_data; Owner: postgres
--

ALTER TABLE ONLY gis_data.no_background
    ADD CONSTRAINT pk_no_background PRIMARY KEY (id);


--
-- TOC entry 4885 (class 2606 OID 30429)
-- Name: arco pk_arco; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT pk_arco PRIMARY KEY (cod_arco);


--
-- TOC entry 4887 (class 2606 OID 30431)
-- Name: arco_carreggiata pk_arco_carreggiata; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_carreggiata
    ADD CONSTRAINT pk_arco_carreggiata PRIMARY KEY (id);


--
-- TOC entry 4889 (class 2606 OID 30433)
-- Name: arco_class_funz pk_arco_class_funz; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_class_funz
    ADD CONSTRAINT pk_arco_class_funz PRIMARY KEY (id);


--
-- TOC entry 4891 (class 2606 OID 30435)
-- Name: arco_classe pk_arco_classe; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_classe
    ADD CONSTRAINT pk_arco_classe PRIMARY KEY (id);


--
-- TOC entry 4893 (class 2606 OID 30437)
-- Name: arco_fondazione pk_arco_fondazione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_fondazione
    ADD CONSTRAINT pk_arco_fondazione PRIMARY KEY (id);


--
-- TOC entry 4895 (class 2606 OID 30439)
-- Name: arco_fondo pk_arco_fondo; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_fondo
    ADD CONSTRAINT pk_arco_fondo PRIMARY KEY (id);


--
-- TOC entry 4897 (class 2606 OID 30441)
-- Name: arco_fonte pk_arco_fonte; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_fonte
    ADD CONSTRAINT pk_arco_fonte PRIMARY KEY (id);


--
-- TOC entry 4899 (class 2606 OID 30443)
-- Name: arco_funzionalita pk_arco_funzionalita; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_funzionalita
    ADD CONSTRAINT pk_arco_funzionalita PRIMARY KEY (id);


--
-- TOC entry 4901 (class 2606 OID 30445)
-- Name: arco_livello pk_arco_livello; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_livello
    ADD CONSTRAINT pk_arco_livello PRIMARY KEY (id);


--
-- TOC entry 4903 (class 2606 OID 30447)
-- Name: arco_marcia pk_arco_marcia; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_marcia
    ADD CONSTRAINT pk_arco_marcia PRIMARY KEY (id);


--
-- TOC entry 4905 (class 2606 OID 30449)
-- Name: arco_mot_ridenominazione pk_arco_mot_ridenominazione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_mot_ridenominazione
    ADD CONSTRAINT pk_arco_mot_ridenominazione PRIMARY KEY (id);


--
-- TOC entry 4907 (class 2606 OID 30451)
-- Name: arco_origine pk_arco_origine; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_origine
    ADD CONSTRAINT pk_arco_origine PRIMARY KEY (id);


--
-- TOC entry 4909 (class 2606 OID 30453)
-- Name: arco_pavimentazione pk_arco_pavimentazione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_pavimentazione
    ADD CONSTRAINT pk_arco_pavimentazione PRIMARY KEY (id);


--
-- TOC entry 4911 (class 2606 OID 30455)
-- Name: arco_portata pk_arco_portata; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_portata
    ADD CONSTRAINT pk_arco_portata PRIMARY KEY (id);


--
-- TOC entry 4913 (class 2606 OID 30457)
-- Name: arco_proprieta pk_arco_proprieta; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_proprieta
    ADD CONSTRAINT pk_arco_proprieta PRIMARY KEY (id);


--
-- TOC entry 4915 (class 2606 OID 30459)
-- Name: arco_sede pk_arco_sede; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_sede
    ADD CONSTRAINT pk_arco_sede PRIMARY KEY (id);


--
-- TOC entry 4917 (class 2606 OID 30461)
-- Name: arco_senso_percorrenza pk_arco_senso_percorrenza; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_senso_percorrenza
    ADD CONSTRAINT pk_arco_senso_percorrenza PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 30463)
-- Name: arco_sezione pk_arco_sezione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_sezione
    ADD CONSTRAINT pk_arco_sezione PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 30465)
-- Name: arco_stato_cons pk_arco_stato_cons; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_stato_cons
    ADD CONSTRAINT pk_arco_stato_cons PRIMARY KEY (id);


--
-- TOC entry 4923 (class 2606 OID 30467)
-- Name: arco_stato_esercizio pk_arco_stato_esercizio; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_stato_esercizio
    ADD CONSTRAINT pk_arco_stato_esercizio PRIMARY KEY (id);


--
-- TOC entry 4925 (class 2606 OID 30469)
-- Name: arco_strada_cs pk_arco_strada_cs; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_strada_cs
    ADD CONSTRAINT pk_arco_strada_cs PRIMARY KEY (id);


--
-- TOC entry 4927 (class 2606 OID 30471)
-- Name: arco_tipo pk_arco_tipo; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_tipo
    ADD CONSTRAINT pk_arco_tipo PRIMARY KEY (id);


--
-- TOC entry 4929 (class 2606 OID 30473)
-- Name: arco_tipologia pk_arco_tipologia; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_tipologia
    ADD CONSTRAINT pk_arco_tipologia PRIMARY KEY (id);


--
-- TOC entry 4931 (class 2606 OID 30475)
-- Name: arco_uso pk_arco_uso; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_uso
    ADD CONSTRAINT pk_arco_uso PRIMARY KEY (id);


--
-- TOC entry 4933 (class 2606 OID 30477)
-- Name: arco_viabilita pk_arco_viabilita; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco_viabilita
    ADD CONSTRAINT pk_arco_viabilita PRIMARY KEY (id);


--
-- TOC entry 4936 (class 2606 OID 30479)
-- Name: civico pk_civico; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico
    ADD CONSTRAINT pk_civico PRIMARY KEY (id);


--
-- TOC entry 4940 (class 2606 OID 30481)
-- Name: civico_lato_strada pk_civico_lato_strada; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_lato_strada
    ADD CONSTRAINT pk_civico_lato_strada PRIMARY KEY (id);


--
-- TOC entry 4942 (class 2606 OID 30483)
-- Name: civico_mot_cessazione pk_civico_mot_cessazione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_mot_cessazione
    ADD CONSTRAINT pk_civico_mot_cessazione PRIMARY KEY (id);


--
-- TOC entry 4944 (class 2606 OID 30485)
-- Name: civico_mot_inserimento pk_civico_mot_inserimento; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_mot_inserimento
    ADD CONSTRAINT pk_civico_mot_inserimento PRIMARY KEY (id);


--
-- TOC entry 4946 (class 2606 OID 30487)
-- Name: civico_particelle pk_civico_particelle; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_particelle
    ADD CONSTRAINT pk_civico_particelle PRIMARY KEY (id_civico, foglio, numero);


--
-- TOC entry 4948 (class 2606 OID 30489)
-- Name: civico_tipo_ingresso pk_civico_tipo_ingresso; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_tipo_ingresso
    ADD CONSTRAINT pk_civico_tipo_ingresso PRIMARY KEY (id);


--
-- TOC entry 4950 (class 2606 OID 30491)
-- Name: civico_trac pk_civico_trac; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_trac
    ADD CONSTRAINT pk_civico_trac PRIMARY KEY (id);


--
-- TOC entry 4953 (class 2606 OID 33587)
-- Name: civico_zona pk_civico_zona; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_zona
    ADD CONSTRAINT pk_civico_zona PRIMARY KEY (id_civico, id_zona);


--
-- TOC entry 4958 (class 2606 OID 30495)
-- Name: edificio pk_edificio; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio
    ADD CONSTRAINT pk_edificio PRIMARY KEY (id);


--
-- TOC entry 4966 (class 2606 OID 30497)
-- Name: edificio_diff_catasto pk_edificio_diff_catasto; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio_diff_catasto
    ADD CONSTRAINT pk_edificio_diff_catasto PRIMARY KEY (id);


--
-- TOC entry 4968 (class 2606 OID 30499)
-- Name: edificio_mot_cessazione pk_edificio_mot_cessazione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio_mot_cessazione
    ADD CONSTRAINT pk_edificio_mot_cessazione PRIMARY KEY (id);


--
-- TOC entry 4960 (class 2606 OID 30501)
-- Name: edificio_stato pk_edificio_stato; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio_stato
    ADD CONSTRAINT pk_edificio_stato PRIMARY KEY (id);


--
-- TOC entry 4962 (class 2606 OID 30503)
-- Name: edificio_tipo pk_edificio_tipo; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio_tipo
    ADD CONSTRAINT pk_edificio_tipo PRIMARY KEY (id);


--
-- TOC entry 4964 (class 2606 OID 30505)
-- Name: edificio_uso_prevalente pk_edificio_uso_prevalente; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio_uso_prevalente
    ADD CONSTRAINT pk_edificio_uso_prevalente PRIMARY KEY (id);


--
-- TOC entry 4970 (class 2606 OID 30507)
-- Name: log pk_log; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.log
    ADD CONSTRAINT pk_log PRIMARY KEY (id);


--
-- TOC entry 4972 (class 2606 OID 30509)
-- Name: nodo pk_nodo; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.nodo
    ADD CONSTRAINT pk_nodo PRIMARY KEY (id);


--
-- TOC entry 4974 (class 2606 OID 30511)
-- Name: nodo_tipo pk_nodo_tipo; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.nodo_tipo
    ADD CONSTRAINT pk_nodo_tipo PRIMARY KEY (id);


--
-- TOC entry 4979 (class 2606 OID 30513)
-- Name: tipo_lim_amm pk_tipo_lim_amm; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.tipo_lim_amm
    ADD CONSTRAINT pk_tipo_lim_amm PRIMARY KEY (id);


--
-- TOC entry 4956 (class 2606 OID 30515)
-- Name: via pk_via; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via
    ADD CONSTRAINT pk_via PRIMARY KEY (cod_via);


--
-- TOC entry 4981 (class 2606 OID 30517)
-- Name: via_classificazione pk_via_classificazione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_classificazione
    ADD CONSTRAINT pk_via_classificazione PRIMARY KEY (id);


--
-- TOC entry 4983 (class 2606 OID 30519)
-- Name: via_mot_cessazione pk_via_mot_cessazione; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_mot_cessazione
    ADD CONSTRAINT pk_via_mot_cessazione PRIMARY KEY (id);


--
-- TOC entry 4985 (class 2606 OID 30521)
-- Name: via_tipo pk_via_tipo; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_tipo
    ADD CONSTRAINT pk_via_tipo PRIMARY KEY (id);


--
-- TOC entry 4987 (class 2606 OID 30523)
-- Name: via_tipo_numero pk_via_tipo_numero; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_tipo_numero
    ADD CONSTRAINT pk_via_tipo_numero PRIMARY KEY (id);


--
-- TOC entry 4989 (class 2606 OID 30525)
-- Name: via_trac pk_via_trac; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_trac
    ADD CONSTRAINT pk_via_trac PRIMARY KEY (id);


--
-- TOC entry 4992 (class 2606 OID 30527)
-- Name: zona pk_zona; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.zona
    ADD CONSTRAINT pk_zona PRIMARY KEY (id);


--
-- TOC entry 4994 (class 2606 OID 30529)
-- Name: zona_tipo pk_zona_tipo; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.zona_tipo
    ADD CONSTRAINT pk_zona_tipo PRIMARY KEY (id);


--
-- TOC entry 4976 (class 2606 OID 30531)
-- Name: quartieri quartieri_pkey; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.quartieri
    ADD CONSTRAINT quartieri_pkey PRIMARY KEY (gid);


--
-- TOC entry 4938 (class 2606 OID 30533)
-- Name: civico un_civico; Type: CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico
    ADD CONSTRAINT un_civico UNIQUE (cod_via, numero, esponente, estensione);


--
-- TOC entry 5074 (class 2606 OID 33626)
-- Name: macro aree macro aree_pkey; Type: CONSTRAINT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public."macro aree"
    ADD CONSTRAINT "macro aree_pkey" PRIMARY KEY (gid);


--
-- TOC entry 5083 (class 2606 OID 33701)
-- Name: pap pap_pkey; Type: CONSTRAINT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public.pap
    ADD CONSTRAINT pap_pkey PRIMARY KEY (gid);


--
-- TOC entry 4996 (class 2606 OID 30535)
-- Name: ctx_operator pk_ctx_operator; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ctx_operator
    ADD CONSTRAINT pk_ctx_operator PRIMARY KEY (id);


--
-- TOC entry 4998 (class 2606 OID 30537)
-- Name: event pk_event; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT pk_event PRIMARY KEY (id);


--
-- TOC entry 5000 (class 2606 OID 30539)
-- Name: event_type pk_event_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_type
    ADD CONSTRAINT pk_event_type PRIMARY KEY (id);


--
-- TOC entry 5004 (class 2606 OID 30541)
-- Name: event_type_permission pk_event_type_permission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_type_permission
    ADD CONSTRAINT pk_event_type_permission PRIMARY KEY (event_type_id, permission_id);


--
-- TOC entry 5006 (class 2606 OID 30543)
-- Name: i18n pk_i18n; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n
    ADD CONSTRAINT pk_i18n PRIMARY KEY (id);


--
-- TOC entry 5008 (class 2606 OID 30545)
-- Name: i18n_string pk_i18n_string; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_string
    ADD CONSTRAINT pk_i18n_string PRIMARY KEY (id);


--
-- TOC entry 5012 (class 2606 OID 30547)
-- Name: menu pk_menu; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT pk_menu PRIMARY KEY (id);


--
-- TOC entry 5014 (class 2606 OID 30549)
-- Name: menu_item pk_menu_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT pk_menu_item PRIMARY KEY (id);


--
-- TOC entry 5016 (class 2606 OID 30551)
-- Name: permission pk_permission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT pk_permission PRIMARY KEY (id);


--
-- TOC entry 5020 (class 2606 OID 30553)
-- Name: permission_role pk_permission_role; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_role
    ADD CONSTRAINT pk_permission_role PRIMARY KEY (permission_id, role_id);


--
-- TOC entry 5022 (class 2606 OID 30555)
-- Name: role pk_role; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT pk_role PRIMARY KEY (id);


--
-- TOC entry 5024 (class 2606 OID 30557)
-- Name: role_sysuser pk_role_sysuser; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_sysuser
    ADD CONSTRAINT pk_role_sysuser PRIMARY KEY (role_id, sysuser_id);


--
-- TOC entry 5026 (class 2606 OID 30559)
-- Name: session pk_session; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT pk_session PRIMARY KEY (id);


--
-- TOC entry 5028 (class 2606 OID 30561)
-- Name: sysuser pk_sysuser; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sysuser
    ADD CONSTRAINT pk_sysuser PRIMARY KEY (id);


--
-- TOC entry 5035 (class 2606 OID 30563)
-- Name: user_layer_style pk_user_layer_style; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_layer_style
    ADD CONSTRAINT pk_user_layer_style PRIMARY KEY (id);


--
-- TOC entry 5045 (class 2606 OID 30565)
-- Name: wg_base_map pk_wg_base_map; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_base_map
    ADD CONSTRAINT pk_wg_base_map PRIMARY KEY (id);


--
-- TOC entry 5039 (class 2606 OID 30569)
-- Name: wg_category pk_wg_category; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_category
    ADD CONSTRAINT pk_wg_category PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 30571)
-- Name: wg_geometry pk_wg_geometry; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_geometry
    ADD CONSTRAINT pk_wg_geometry PRIMARY KEY (id);


--
-- TOC entry 5041 (class 2606 OID 30573)
-- Name: wg_layer pk_wg_layer; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer
    ADD CONSTRAINT pk_wg_layer PRIMARY KEY (id);


--
-- TOC entry 5049 (class 2606 OID 30575)
-- Name: wg_layer_attach pk_wg_layer_attach; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer_attach
    ADD CONSTRAINT pk_wg_layer_attach PRIMARY KEY (id);


--
-- TOC entry 5051 (class 2606 OID 30577)
-- Name: wg_layer_type pk_wg_layer_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer_type
    ADD CONSTRAINT pk_wg_layer_type PRIMARY KEY (id);


--
-- TOC entry 5053 (class 2606 OID 30580)
-- Name: wg_legend pk_wg_legend; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_legend
    ADD CONSTRAINT pk_wg_legend PRIMARY KEY (id);


--
-- TOC entry 5055 (class 2606 OID 30582)
-- Name: wg_legend_class pk_wg_legend_class; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_legend_class
    ADD CONSTRAINT pk_wg_legend_class PRIMARY KEY (id);


--
-- TOC entry 5057 (class 2606 OID 30584)
-- Name: wg_map pk_wg_map; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_map
    ADD CONSTRAINT pk_wg_map PRIMARY KEY (id);


--
-- TOC entry 5059 (class 2606 OID 30586)
-- Name: wg_map_rs pk_wg_map_rs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_map_rs
    ADD CONSTRAINT pk_wg_map_rs PRIMARY KEY (id);


--
-- TOC entry 5061 (class 2606 OID 30588)
-- Name: wg_map_tools pk_wg_map_tool; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_map_tools
    ADD CONSTRAINT pk_wg_map_tool PRIMARY KEY (id);


--
-- TOC entry 5063 (class 2606 OID 30590)
-- Name: wg_server pk_wg_server; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_server
    ADD CONSTRAINT pk_wg_server PRIMARY KEY (id);


--
-- TOC entry 5065 (class 2606 OID 30592)
-- Name: wg_style_fill pk_wg_style_fill; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_style_fill
    ADD CONSTRAINT pk_wg_style_fill PRIMARY KEY (id);


--
-- TOC entry 5067 (class 2606 OID 30594)
-- Name: wg_style_shape pk_wg_style_shape; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_style_shape
    ADD CONSTRAINT pk_wg_style_shape PRIMARY KEY (id);


--
-- TOC entry 5069 (class 2606 OID 30596)
-- Name: wg_style_stroke pk_wg_style_stroke; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_style_stroke
    ADD CONSTRAINT pk_wg_style_stroke PRIMARY KEY (id);


--
-- TOC entry 5071 (class 2606 OID 30598)
-- Name: wg_style_type pk_wg_style_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_style_type
    ADD CONSTRAINT pk_wg_style_type PRIMARY KEY (id);


--
-- TOC entry 5077 (class 2606 OID 33654)
-- Name: quartieri quartieri_pkey; Type: CONSTRAINT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public.quartieri
    ADD CONSTRAINT quartieri_pkey PRIMARY KEY (gid);


--
-- TOC entry 5002 (class 2606 OID 30600)
-- Name: event_type un_event_type_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_type
    ADD CONSTRAINT un_event_type_name UNIQUE (name);


--
-- TOC entry 5010 (class 2606 OID 30602)
-- Name: i18n_string un_i18n_string_object_id_label_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_string
    ADD CONSTRAINT un_i18n_string_object_id_label_key UNIQUE (object_id, label_key);


--
-- TOC entry 5018 (class 2606 OID 30604)
-- Name: permission un_permission_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT un_permission_name UNIQUE (name);


--
-- TOC entry 5030 (class 2606 OID 30606)
-- Name: sysuser un_sysuser_username; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sysuser
    ADD CONSTRAINT un_sysuser_username UNIQUE (username);


--
-- TOC entry 5037 (class 2606 OID 30608)
-- Name: user_layer_style un_user_layer_style_user_id_layer_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_layer_style
    ADD CONSTRAINT un_user_layer_style_user_id_layer_id UNIQUE (user_id, layer_id);


--
-- TOC entry 5043 (class 2606 OID 30610)
-- Name: wg_layer un_wg_layer_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer
    ADD CONSTRAINT un_wg_layer_key UNIQUE (key);


--
-- TOC entry 5032 (class 2606 OID 30612)
-- Name: sysuser un_wso2username; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sysuser
    ADD CONSTRAINT un_wso2username UNIQUE (wso2_username);


--
-- TOC entry 5080 (class 2606 OID 33673)
-- Name: zone spazzamento zone spazzamento_pkey; Type: CONSTRAINT; Schema: public; Owner: user_stretor
--

ALTER TABLE ONLY public."zone spazzamento"
    ADD CONSTRAINT "zone spazzamento_pkey" PRIMARY KEY (gid);


--
-- TOC entry 4880 (class 1259 OID 30613)
-- Name: sidx_confine_geom; Type: INDEX; Schema: gis_data; Owner: postgres
--

CREATE INDEX sidx_confine_geom ON gis_data.confine USING gist (geom);


--
-- TOC entry 4883 (class 1259 OID 30619)
-- Name: idx_arco_cod_via; Type: INDEX; Schema: grafo; Owner: postgres
--

CREATE INDEX idx_arco_cod_via ON grafo.arco USING btree (cod_via);


--
-- TOC entry 4934 (class 1259 OID 30624)
-- Name: idx_civico_cod_arco; Type: INDEX; Schema: grafo; Owner: postgres
--

CREATE INDEX idx_civico_cod_arco ON grafo.civico USING btree (cod_arco);


--
-- TOC entry 4951 (class 1259 OID 30625)
-- Name: idx_civico_zona_id_zona; Type: INDEX; Schema: grafo; Owner: postgres
--

CREATE INDEX idx_civico_zona_id_zona ON grafo.civico_zona USING btree (id_zona);


--
-- TOC entry 4954 (class 1259 OID 30640)
-- Name: idx_via_cod_via; Type: INDEX; Schema: grafo; Owner: postgres
--

CREATE INDEX idx_via_cod_via ON grafo.via USING btree (cod_via);


--
-- TOC entry 4990 (class 1259 OID 30641)
-- Name: idx_zona_id_tipo; Type: INDEX; Schema: grafo; Owner: postgres
--

CREATE INDEX idx_zona_id_tipo ON grafo.zona USING btree (id_tipo);


--
-- TOC entry 4977 (class 1259 OID 30642)
-- Name: sidx_quartieri_geom; Type: INDEX; Schema: grafo; Owner: postgres
--

CREATE INDEX sidx_quartieri_geom ON grafo.quartieri USING gist (geom);


--
-- TOC entry 5033 (class 1259 OID 30643)
-- Name: fki_fk_user_layer_style_layer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_user_layer_style_layer_id ON public.user_layer_style USING btree (layer_id);


--
-- TOC entry 5072 (class 1259 OID 33635)
-- Name: macro aree_geom_idx; Type: INDEX; Schema: public; Owner: user_stretor
--

CREATE INDEX "macro aree_geom_idx" ON public."macro aree" USING gist (geom);


--
-- TOC entry 5081 (class 1259 OID 33708)
-- Name: pap_geom_idx; Type: INDEX; Schema: public; Owner: user_stretor
--

CREATE INDEX pap_geom_idx ON public.pap USING gist (geom);


--
-- TOC entry 5075 (class 1259 OID 33665)
-- Name: quartieri_geom_idx; Type: INDEX; Schema: public; Owner: user_stretor
--

CREATE INDEX quartieri_geom_idx ON public.quartieri USING gist (geom);


--
-- TOC entry 5078 (class 1259 OID 33682)
-- Name: zone spazzamento_geom_idx; Type: INDEX; Schema: public; Owner: user_stretor
--

CREATE INDEX "zone spazzamento_geom_idx" ON public."zone spazzamento" USING gist (geom);


--
-- TOC entry 5314 (class 2618 OID 33603)
-- Name: view_civico _RETURN; Type: RULE; Schema: grafo; Owner: postgres
--

CREATE OR REPLACE VIEW grafo.view_civico AS
 SELECT c.id,
    c.id_civico_principale,
    c.cod_arco,
    c.cod_via,
    c.id_edificio,
    array_to_string(c.id_edificio, ', '::text) AS id_edificio_str,
    c.numero,
    c.esponente,
    c.cap,
    c.serv_rsu,
    c.provvisorio,
    c.tipo_ingr,
    c.nota,
    c.data_ini,
    c.data_fine,
    c.data_inserimento,
    c.numero_delib,
    c.id_mot_cessazione,
    c.prev_civico,
    c.x,
    c.y,
    c.geom,
    c.targa_x,
    c.targa_y,
    c.targa_ang,
    c.id_mot_inserimento,
    c.data_ins_mappa,
    c.data_ri_mappa,
    c.id_tipo_ingresso,
    c.carrabile,
    c.accesso_multiplo,
    c.proiezione_x,
    c.proiezione_y,
    c.id_lato_strada,
    c.principale,
    c.estensione,
    v.denominazione AS nome_via,
    (array_agg(z.valore ORDER BY z.id_tipo))[1] AS localita,
    (array_agg(z.valore ORDER BY z.id_tipo))[2] AS municipio,
        CASE
            WHEN ((now() < c.data_fine) OR (c.data_fine IS NULL)) THEN true
            ELSE false
        END AS is_valid_now
   FROM ((grafo.civico c
     LEFT JOIN grafo.via v ON ((c.cod_via = v.cod_via)))
     LEFT JOIN grafo.zona z ON ((((z.id)::text IN ( SELECT civico_zona.id_zona
           FROM grafo.civico_zona
          WHERE (civico_zona.id_civico = c.id))) AND (z.id_tipo = ANY (ARRAY[1, 2])))))
  GROUP BY c.id, v.denominazione;


--
-- TOC entry 5316 (class 2618 OID 33613)
-- Name: view_via _RETURN; Type: RULE; Schema: grafo; Owner: postgres
--

CREATE OR REPLACE VIEW grafo.view_via AS
 SELECT v.cod_via,
    v.id_tipo,
    v.denominazione,
    v.num_delib,
    v.data_delib,
    v.id_tipo_numero,
    v.nota,
    v.data_ini,
    v.data_fine,
    v.data_inserimento,
    v.id_mot_cessazione,
    v.prev_via,
    v.denom_breve,
    v.id_classificazione,
    v.denom_pura,
    v.sottotitolo,
    v.descrizione_alt1,
    v.descrizione_alt2,
    v.descrizione_alt3,
    v.descrizione_alt4,
    v.descrizione_alt5,
    v.descrizione_alt6,
    v.data_verbale,
    v.larghezza,
    v.localita,
    v.municipio,
    ( SELECT array_agg(zona.valore) AS array_agg
           FROM grafo.zona
          WHERE ((zona.id)::text = ANY ((v.localita)::text[]))) AS localita_val,
    ( SELECT array_agg(zona.valore) AS array_agg
           FROM grafo.zona
          WHERE ((zona.id)::text = ANY ((v.municipio)::text[]))) AS municipio_val,
    count(a.cod_arco) AS archi,
    sum(a.lunghezza) AS lunghezza,
    NULL::integer AS civiminp,
    NULL::integer AS civimaxp,
    NULL::integer AS civimind,
    NULL::integer AS civimaxd,
    public.st_extent(a.geom) AS extent,
        CASE
            WHEN ((now() < v.data_fine) OR (v.data_fine IS NULL)) THEN true
            ELSE false
        END AS is_valid_now
   FROM (grafo.via v
     LEFT JOIN grafo.arco a ON ((v.cod_via = a.cod_via)))
  GROUP BY v.cod_via;


--
-- TOC entry 5167 (class 2620 OID 30648)
-- Name: civico geom_from_xy; Type: TRIGGER; Schema: grafo; Owner: postgres
--

CREATE TRIGGER geom_from_xy BEFORE INSERT OR UPDATE ON grafo.civico FOR EACH ROW EXECUTE PROCEDURE public.get_geom_from_xy();


--
-- TOC entry 5084 (class 2606 OID 30649)
-- Name: arco fk_arco_cod_via; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_cod_via FOREIGN KEY (cod_via) REFERENCES grafo.via(cod_via);


--
-- TOC entry 5085 (class 2606 OID 30654)
-- Name: arco fk_arco_cod_via_a; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_cod_via_a FOREIGN KEY (cod_via_a) REFERENCES grafo.via(cod_via);


--
-- TOC entry 5086 (class 2606 OID 30659)
-- Name: arco fk_arco_cod_via_da; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_cod_via_da FOREIGN KEY (cod_via_da) REFERENCES grafo.via(cod_via);


--
-- TOC entry 5087 (class 2606 OID 30665)
-- Name: arco fk_arco_id_carreggiata; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_carreggiata FOREIGN KEY (id_carreggiata) REFERENCES grafo.arco_carreggiata(id);


--
-- TOC entry 5088 (class 2606 OID 30670)
-- Name: arco fk_arco_id_class_funz; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_class_funz FOREIGN KEY (id_class_funz) REFERENCES grafo.arco_class_funz(id);


--
-- TOC entry 5089 (class 2606 OID 30675)
-- Name: arco fk_arco_id_classe; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_classe FOREIGN KEY (id_classe) REFERENCES grafo.arco_classe(id);


--
-- TOC entry 5090 (class 2606 OID 30680)
-- Name: arco fk_arco_id_fondazione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_fondazione FOREIGN KEY (id_fondazione) REFERENCES grafo.arco_fondazione(id);


--
-- TOC entry 5091 (class 2606 OID 30686)
-- Name: arco fk_arco_id_fondo; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_fondo FOREIGN KEY (id_fondo) REFERENCES grafo.arco_fondo(id);


--
-- TOC entry 5092 (class 2606 OID 30691)
-- Name: arco fk_arco_id_fonte; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_fonte FOREIGN KEY (id_fonte) REFERENCES grafo.arco_fonte(id);


--
-- TOC entry 5093 (class 2606 OID 30696)
-- Name: arco fk_arco_id_funzionalita; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_funzionalita FOREIGN KEY (id_funzionalita) REFERENCES grafo.arco_funzionalita(id);


--
-- TOC entry 5094 (class 2606 OID 30701)
-- Name: arco fk_arco_id_livello; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_livello FOREIGN KEY (id_livello) REFERENCES grafo.arco_livello(id);


--
-- TOC entry 5095 (class 2606 OID 30706)
-- Name: arco fk_arco_id_marcia; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_marcia FOREIGN KEY (id_marcia) REFERENCES grafo.arco_marcia(id);


--
-- TOC entry 5096 (class 2606 OID 30711)
-- Name: arco fk_arco_id_muni_disp; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_muni_disp FOREIGN KEY (id_muni_disp) REFERENCES grafo.zona(id);


--
-- TOC entry 5097 (class 2606 OID 30716)
-- Name: arco fk_arco_id_muni_pari; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_muni_pari FOREIGN KEY (id_muni_pari) REFERENCES grafo.zona(id);


--
-- TOC entry 5098 (class 2606 OID 30721)
-- Name: arco fk_arco_id_origine; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_origine FOREIGN KEY (id_origine) REFERENCES grafo.arco_origine(id);


--
-- TOC entry 5099 (class 2606 OID 30726)
-- Name: arco fk_arco_id_paviment; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_paviment FOREIGN KEY (id_paviment) REFERENCES grafo.arco_pavimentazione(id);


--
-- TOC entry 5100 (class 2606 OID 30731)
-- Name: arco fk_arco_id_portata; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_portata FOREIGN KEY (id_portata) REFERENCES grafo.arco_portata(id);


--
-- TOC entry 5101 (class 2606 OID 30736)
-- Name: arco fk_arco_id_proprieta; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_proprieta FOREIGN KEY (id_proprieta) REFERENCES grafo.arco_proprieta(id);


--
-- TOC entry 5102 (class 2606 OID 30741)
-- Name: arco fk_arco_id_quart_disp; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_quart_disp FOREIGN KEY (id_quart_disp) REFERENCES grafo.zona(id);


--
-- TOC entry 5103 (class 2606 OID 30746)
-- Name: arco fk_arco_id_quart_pari; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_quart_pari FOREIGN KEY (id_quart_pari) REFERENCES grafo.zona(id);


--
-- TOC entry 5104 (class 2606 OID 30751)
-- Name: arco fk_arco_id_sede; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_sede FOREIGN KEY (id_sede) REFERENCES grafo.arco_sede(id);


--
-- TOC entry 5105 (class 2606 OID 30756)
-- Name: arco fk_arco_id_senso_percorrenza; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_senso_percorrenza FOREIGN KEY (id_senso_percorrenza) REFERENCES grafo.arco_senso_percorrenza(id);


--
-- TOC entry 5106 (class 2606 OID 30761)
-- Name: arco fk_arco_id_sezione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_sezione FOREIGN KEY (id_sezione) REFERENCES grafo.arco_sezione(id);


--
-- TOC entry 5107 (class 2606 OID 30766)
-- Name: arco fk_arco_id_stato_cons; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_stato_cons FOREIGN KEY (id_stato_cons) REFERENCES grafo.arco_stato_cons(id);


--
-- TOC entry 5108 (class 2606 OID 30771)
-- Name: arco fk_arco_id_stato_esercizio; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_stato_esercizio FOREIGN KEY (id_stato_esercizio) REFERENCES grafo.arco_stato_esercizio(id);


--
-- TOC entry 5109 (class 2606 OID 30776)
-- Name: arco fk_arco_id_strada_cs; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_strada_cs FOREIGN KEY (id_stra_cs) REFERENCES grafo.arco_strada_cs(id);


--
-- TOC entry 5110 (class 2606 OID 30781)
-- Name: arco fk_arco_id_tipo; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_tipo FOREIGN KEY (id_tipo) REFERENCES grafo.arco_tipo(id);


--
-- TOC entry 5111 (class 2606 OID 30786)
-- Name: arco fk_arco_id_tipo_lim_amm; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_tipo_lim_amm FOREIGN KEY (id_tipo_lim_amm) REFERENCES grafo.tipo_lim_amm(id);


--
-- TOC entry 5112 (class 2606 OID 30791)
-- Name: arco fk_arco_id_tipologia; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_tipologia FOREIGN KEY (id_tipologia) REFERENCES grafo.arco_tipologia(id);


--
-- TOC entry 5113 (class 2606 OID 30796)
-- Name: arco fk_arco_id_uso; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_uso FOREIGN KEY (id_uso) REFERENCES grafo.arco_uso(id);


--
-- TOC entry 5114 (class 2606 OID 30801)
-- Name: arco fk_arco_id_viabilita; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_id_viabilita FOREIGN KEY (id_viabilita) REFERENCES grafo.arco_viabilita(id);


--
-- TOC entry 5115 (class 2606 OID 30806)
-- Name: arco fk_arco_nodo_a; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_nodo_a FOREIGN KEY (nodo_a) REFERENCES grafo.nodo(id);


--
-- TOC entry 5116 (class 2606 OID 30811)
-- Name: arco fk_arco_nodo_da; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.arco
    ADD CONSTRAINT fk_arco_nodo_da FOREIGN KEY (nodo_da) REFERENCES grafo.nodo(id);


--
-- TOC entry 5117 (class 2606 OID 30816)
-- Name: civico fk_civico_id_civico_principale; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico
    ADD CONSTRAINT fk_civico_id_civico_principale FOREIGN KEY (id_civico_principale) REFERENCES grafo.civico(id);


--
-- TOC entry 5118 (class 2606 OID 30821)
-- Name: civico fk_civico_id_lato_strada; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico
    ADD CONSTRAINT fk_civico_id_lato_strada FOREIGN KEY (id_lato_strada) REFERENCES grafo.civico_lato_strada(id);


--
-- TOC entry 5119 (class 2606 OID 30826)
-- Name: civico fk_civico_id_mot_cessazione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico
    ADD CONSTRAINT fk_civico_id_mot_cessazione FOREIGN KEY (id_mot_cessazione) REFERENCES grafo.civico_mot_cessazione(id);


--
-- TOC entry 5120 (class 2606 OID 30831)
-- Name: civico fk_civico_id_mot_inserimento; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico
    ADD CONSTRAINT fk_civico_id_mot_inserimento FOREIGN KEY (id_mot_inserimento) REFERENCES grafo.civico_mot_inserimento(id);


--
-- TOC entry 5121 (class 2606 OID 30836)
-- Name: civico fk_civico_id_tipo_ingresso; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico
    ADD CONSTRAINT fk_civico_id_tipo_ingresso FOREIGN KEY (id_tipo_ingresso) REFERENCES grafo.civico_tipo_ingresso(id);


--
-- TOC entry 5122 (class 2606 OID 30841)
-- Name: civico_particelle fk_civico_particelle_id_civico; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_particelle
    ADD CONSTRAINT fk_civico_particelle_id_civico FOREIGN KEY (id_civico) REFERENCES grafo.civico(id);


--
-- TOC entry 5128 (class 2606 OID 30846)
-- Name: civico_zona fk_civico_zona_civico; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_zona
    ADD CONSTRAINT fk_civico_zona_civico FOREIGN KEY (id_civico) REFERENCES grafo.civico(id);


--
-- TOC entry 5129 (class 2606 OID 30851)
-- Name: civico_zona fk_civico_zona_zona; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_zona
    ADD CONSTRAINT fk_civico_zona_zona FOREIGN KEY (id_zona) REFERENCES grafo.zona(id);


--
-- TOC entry 5134 (class 2606 OID 30856)
-- Name: edificio fk_edificio_id_diff_catasto; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio
    ADD CONSTRAINT fk_edificio_id_diff_catasto FOREIGN KEY (id_diff_catasto) REFERENCES grafo.edificio_diff_catasto(id);


--
-- TOC entry 5135 (class 2606 OID 30861)
-- Name: edificio fk_edificio_id_mot_cessazione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio
    ADD CONSTRAINT fk_edificio_id_mot_cessazione FOREIGN KEY (id_mot_cessazione) REFERENCES grafo.edificio_mot_cessazione(id);


--
-- TOC entry 5136 (class 2606 OID 30866)
-- Name: edificio fk_edificio_id_stato; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio
    ADD CONSTRAINT fk_edificio_id_stato FOREIGN KEY (id_stato) REFERENCES grafo.edificio_stato(id);


--
-- TOC entry 5137 (class 2606 OID 30871)
-- Name: edificio fk_edificio_id_tipo; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio
    ADD CONSTRAINT fk_edificio_id_tipo FOREIGN KEY (id_tipo) REFERENCES grafo.edificio_tipo(id);


--
-- TOC entry 5138 (class 2606 OID 30876)
-- Name: edificio fk_edificio_id_uso_prevalente; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.edificio
    ADD CONSTRAINT fk_edificio_id_uso_prevalente FOREIGN KEY (id_uso_prevalente) REFERENCES grafo.edificio_uso_prevalente(id);


--
-- TOC entry 5123 (class 2606 OID 30881)
-- Name: civico_trac fk_id_circoscrizione_zona; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_trac
    ADD CONSTRAINT fk_id_circoscrizione_zona FOREIGN KEY (id_circoscrizione) REFERENCES grafo.zona(id);


--
-- TOC entry 5124 (class 2606 OID 30886)
-- Name: civico_trac fk_id_localita_zona; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_trac
    ADD CONSTRAINT fk_id_localita_zona FOREIGN KEY (id_localita) REFERENCES grafo.zona(id);


--
-- TOC entry 5125 (class 2606 OID 30891)
-- Name: civico_trac fk_id_mot_cessazione_civico_mot_cessazione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_trac
    ADD CONSTRAINT fk_id_mot_cessazione_civico_mot_cessazione FOREIGN KEY (id_mot_cessazione) REFERENCES grafo.civico_mot_cessazione(id);


--
-- TOC entry 5142 (class 2606 OID 30896)
-- Name: via_trac fk_id_mot_cessazione_via_mot_cessazione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_trac
    ADD CONSTRAINT fk_id_mot_cessazione_via_mot_cessazione FOREIGN KEY (id_mot_cessazione) REFERENCES grafo.via_mot_cessazione(id);


--
-- TOC entry 5126 (class 2606 OID 30901)
-- Name: civico_trac fk_id_mot_inserimento_civico_mot_inserimento; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_trac
    ADD CONSTRAINT fk_id_mot_inserimento_civico_mot_inserimento FOREIGN KEY (id_mot_inserimento) REFERENCES grafo.civico_mot_inserimento(id);


--
-- TOC entry 5143 (class 2606 OID 30906)
-- Name: via_trac fk_id_tipo_via_tipo; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_trac
    ADD CONSTRAINT fk_id_tipo_via_tipo FOREIGN KEY (id_tipo) REFERENCES grafo.via_tipo(id);


--
-- TOC entry 5127 (class 2606 OID 30911)
-- Name: civico_trac fk_id_user_sysuser; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.civico_trac
    ADD CONSTRAINT fk_id_user_sysuser FOREIGN KEY (id_user) REFERENCES public.sysuser(id);


--
-- TOC entry 5144 (class 2606 OID 30916)
-- Name: via_trac fk_id_user_sysuser; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via_trac
    ADD CONSTRAINT fk_id_user_sysuser FOREIGN KEY (id_user) REFERENCES public.sysuser(id);


--
-- TOC entry 5139 (class 2606 OID 30921)
-- Name: log fk_log_user_id; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.log
    ADD CONSTRAINT fk_log_user_id FOREIGN KEY (user_id) REFERENCES public.sysuser(id);


--
-- TOC entry 5140 (class 2606 OID 30926)
-- Name: nodo fk_nodo_id_tipo; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.nodo
    ADD CONSTRAINT fk_nodo_id_tipo FOREIGN KEY (id_tipo) REFERENCES grafo.nodo_tipo(id);


--
-- TOC entry 5141 (class 2606 OID 30931)
-- Name: nodo fk_nodo_id_tipo_lim_amm; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.nodo
    ADD CONSTRAINT fk_nodo_id_tipo_lim_amm FOREIGN KEY (id_tipo_lim_amm) REFERENCES grafo.tipo_lim_amm(id);


--
-- TOC entry 5130 (class 2606 OID 30936)
-- Name: via fk_via_id_classificazione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via
    ADD CONSTRAINT fk_via_id_classificazione FOREIGN KEY (id_classificazione) REFERENCES grafo.via_classificazione(id);


--
-- TOC entry 5131 (class 2606 OID 30941)
-- Name: via fk_via_id_mot_cessazione; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via
    ADD CONSTRAINT fk_via_id_mot_cessazione FOREIGN KEY (id_mot_cessazione) REFERENCES grafo.via_mot_cessazione(id);


--
-- TOC entry 5132 (class 2606 OID 30946)
-- Name: via fk_via_id_tipo; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via
    ADD CONSTRAINT fk_via_id_tipo FOREIGN KEY (id_tipo) REFERENCES grafo.via_tipo(id);


--
-- TOC entry 5133 (class 2606 OID 30951)
-- Name: via fk_via_id_tipo_numero; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.via
    ADD CONSTRAINT fk_via_id_tipo_numero FOREIGN KEY (id_tipo_numero) REFERENCES grafo.via_tipo_numero(id);


--
-- TOC entry 5145 (class 2606 OID 30956)
-- Name: zona fk_zona_tipo; Type: FK CONSTRAINT; Schema: grafo; Owner: postgres
--

ALTER TABLE ONLY grafo.zona
    ADD CONSTRAINT fk_zona_tipo FOREIGN KEY (id_tipo) REFERENCES grafo.zona_tipo(id);


--
-- TOC entry 5146 (class 2606 OID 30961)
-- Name: event fk_event_type_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT fk_event_type_id FOREIGN KEY (type_id) REFERENCES public.event_type(id);


--
-- TOC entry 5147 (class 2606 OID 30966)
-- Name: event_type_permission fk_event_type_permission_event_type_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_type_permission
    ADD CONSTRAINT fk_event_type_permission_event_type_id FOREIGN KEY (event_type_id) REFERENCES public.event_type(id);


--
-- TOC entry 5148 (class 2606 OID 30971)
-- Name: event_type_permission fk_event_type_permission_permission_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_type_permission
    ADD CONSTRAINT fk_event_type_permission_permission_id FOREIGN KEY (permission_id) REFERENCES public.permission(id);


--
-- TOC entry 5149 (class 2606 OID 30976)
-- Name: i18n_string fk_i18n_string_object_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.i18n_string
    ADD CONSTRAINT fk_i18n_string_object_id FOREIGN KEY (object_id) REFERENCES public.i18n(id);


--
-- TOC entry 5150 (class 2606 OID 30981)
-- Name: menu_item fk_menu_item_id_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT fk_menu_item_id_group FOREIGN KEY (id_group) REFERENCES public.menu(id);


--
-- TOC entry 5151 (class 2606 OID 30986)
-- Name: permission fk_permission_menu_item_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT fk_permission_menu_item_id FOREIGN KEY (menu_item_id) REFERENCES public.menu_item(id);


--
-- TOC entry 5152 (class 2606 OID 30991)
-- Name: permission_role fk_permission_role_permission_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_role
    ADD CONSTRAINT fk_permission_role_permission_id FOREIGN KEY (permission_id) REFERENCES public.permission(id) ON DELETE CASCADE;


--
-- TOC entry 5153 (class 2606 OID 30996)
-- Name: permission_role fk_permission_role_role_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_role
    ADD CONSTRAINT fk_permission_role_role_id FOREIGN KEY (role_id) REFERENCES public.role(id);


--
-- TOC entry 5154 (class 2606 OID 31001)
-- Name: role_sysuser fk_role_sysuser_role_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_sysuser
    ADD CONSTRAINT fk_role_sysuser_role_id FOREIGN KEY (role_id) REFERENCES public.role(id);


--
-- TOC entry 5155 (class 2606 OID 31006)
-- Name: role_sysuser fk_role_sysuser_sysuser_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_sysuser
    ADD CONSTRAINT fk_role_sysuser_sysuser_id FOREIGN KEY (sysuser_id) REFERENCES public.sysuser(id);


--
-- TOC entry 5156 (class 2606 OID 31011)
-- Name: session fk_session_sysuser_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT fk_session_sysuser_id FOREIGN KEY (sysuser_id) REFERENCES public.sysuser(id) ON DELETE CASCADE;


--
-- TOC entry 5157 (class 2606 OID 31016)
-- Name: user_layer_style fk_user_layer_style_layer_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_layer_style
    ADD CONSTRAINT fk_user_layer_style_layer_id FOREIGN KEY (layer_id) REFERENCES public.wg_layer(id) ON DELETE CASCADE;


--
-- TOC entry 5158 (class 2606 OID 31021)
-- Name: user_layer_style fk_user_layer_style_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_layer_style
    ADD CONSTRAINT fk_user_layer_style_user_id FOREIGN KEY (user_id) REFERENCES public.sysuser(id);


--
-- TOC entry 5163 (class 2606 OID 31026)
-- Name: wg_base_map fk_wg_base_map_id_server; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_base_map
    ADD CONSTRAINT fk_wg_base_map_id_server FOREIGN KEY (id_server) REFERENCES public.wg_server(id);


--
-- TOC entry 5164 (class 2606 OID 31031)
-- Name: wg_layer_attach fk_wg_layer_attach_entity_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer_attach
    ADD CONSTRAINT fk_wg_layer_attach_entity_id FOREIGN KEY (entity_id) REFERENCES public.wg_layer(id);


--
-- TOC entry 5159 (class 2606 OID 31036)
-- Name: wg_layer fk_wg_layer_id_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer
    ADD CONSTRAINT fk_wg_layer_id_category FOREIGN KEY (id_category) REFERENCES public.wg_category(id);


--
-- TOC entry 5160 (class 2606 OID 31041)
-- Name: wg_layer fk_wg_layer_id_parent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer
    ADD CONSTRAINT fk_wg_layer_id_parent FOREIGN KEY (id_parent) REFERENCES public.wg_layer(id);


--
-- TOC entry 5161 (class 2606 OID 31046)
-- Name: wg_layer fk_wg_layer_id_server; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer
    ADD CONSTRAINT fk_wg_layer_id_server FOREIGN KEY (id_server) REFERENCES public.wg_server(id);


--
-- TOC entry 5162 (class 2606 OID 31051)
-- Name: wg_layer fk_wg_layer_id_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_layer
    ADD CONSTRAINT fk_wg_layer_id_type FOREIGN KEY (id_type) REFERENCES public.wg_layer_type(id);


--
-- TOC entry 5166 (class 2606 OID 31056)
-- Name: wg_legend_class fk_wg_legend_class_id_legend; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_legend_class
    ADD CONSTRAINT fk_wg_legend_class_id_legend FOREIGN KEY (id_legend) REFERENCES public.wg_legend(id);


--
-- TOC entry 5165 (class 2606 OID 31061)
-- Name: wg_legend fk_wg_legend_id_layer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wg_legend
    ADD CONSTRAINT fk_wg_legend_id_layer FOREIGN KEY (id_layer) REFERENCES public.wg_layer(id);


--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 11
-- Name: SCHEMA grafo; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA grafo TO user_read_grafo_data;


--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 270
-- Name: TABLE db_grafo_arco; Type: ACL; Schema: grafo; Owner: postgres
--

GRANT SELECT ON TABLE grafo.db_grafo_arco TO user_read_grafo_data WITH GRANT OPTION;


--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE db_grafo_civico; Type: ACL; Schema: grafo; Owner: postgres
--

GRANT SELECT ON TABLE grafo.db_grafo_civico TO user_read_grafo_data;


--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 365
-- Name: TABLE db_grafo_civico_v2; Type: ACL; Schema: grafo; Owner: postgres
--

GRANT SELECT ON TABLE grafo.db_grafo_civico_v2 TO user_read_grafo_data;


--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 276
-- Name: TABLE db_grafo_edificio; Type: ACL; Schema: grafo; Owner: postgres
--

GRANT SELECT ON TABLE grafo.db_grafo_edificio TO user_read_grafo_data;


-- Completed on 2022-08-04 16:47:03

--
-- PostgreSQL database dump complete
--

