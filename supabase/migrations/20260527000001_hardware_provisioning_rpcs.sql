-- ============================================================================
-- CommonGround Co-op — Hardware-node provisioning + rotation RPCs (T1.3, T2.3)
-- ----------------------------------------------------------------------------
-- Adds:
--   * app.provision_hardware_node(node_id, node_type, display_name)
--       → inserts a hardware_nodes row with a freshly-generated 32-byte
--         HMAC secret, returns the secret as a 64-character hex string
--         (the ONLY moment the secret is readable).
--   * app.rotate_hardware_node_secret(node_id)
--       → generates a new secret for an existing node, returns the hex
--         string the operator pastes into the ESP32's serial shell.
--
-- Both SECURITY DEFINER + restricted to coop admins (app.is_coop_admin()).
-- The functions never return the secret again after the call that minted
-- it — the row stores bytea, but the SELECT view masks it.
-- ============================================================================

CREATE OR REPLACE FUNCTION app.provision_hardware_node(
    p_node_id       TEXT,
    p_node_type     TEXT,
    p_display_name  TEXT DEFAULT NULL,
    p_nonce_window_s INTEGER DEFAULT 300
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_coop_id   UUID;
    v_secret    BYTEA;
    v_secret_hex TEXT;
BEGIN
    -- Caller's coop + admin gate.
    v_coop_id := app.current_coop_id();
    IF v_coop_id IS NULL THEN
        RAISE EXCEPTION 'No tenant resolved for caller'
              USING ERRCODE = '42501';
    END IF;
    IF NOT app.is_coop_admin() THEN
        RAISE EXCEPTION 'Only coop admins may provision hardware nodes'
              USING ERRCODE = '42501';
    END IF;

    -- Mint a 32-byte cryptographically-strong secret. pgcrypto's
    -- gen_random_bytes() uses the OS CSPRNG.
    v_secret := public.gen_random_bytes(32);
    v_secret_hex := encode(v_secret, 'hex');

    INSERT INTO public.hardware_nodes (id, coop_id, node_type, display_name, hmac_secret, nonce_window_s)
    VALUES (p_node_id, v_coop_id, p_node_type, p_display_name, v_secret,
            COALESCE(p_nonce_window_s, 300));

    -- Return the hex string ONCE. The operator must paste it into the
    -- device's serial shell now; it cannot be retrieved again.
    RETURN v_secret_hex;
END;
$$;

REVOKE ALL ON FUNCTION app.provision_hardware_node(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.provision_hardware_node(TEXT, TEXT, TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION app.provision_hardware_node(TEXT, TEXT, TEXT, INTEGER) IS
    'Creates a hardware_nodes row + generates a fresh 32-byte HMAC secret. '
    'Returns the secret as a 64-char hex string — the only moment it is '
    'readable. Coop-admin only.';

CREATE OR REPLACE FUNCTION app.rotate_hardware_node_secret(p_node_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_coop_id   UUID;
    v_secret    BYTEA;
    v_secret_hex TEXT;
    v_rows      INTEGER;
BEGIN
    v_coop_id := app.current_coop_id();
    IF v_coop_id IS NULL THEN
        RAISE EXCEPTION 'No tenant resolved for caller'
              USING ERRCODE = '42501';
    END IF;
    IF NOT app.is_coop_admin() THEN
        RAISE EXCEPTION 'Only coop admins may rotate hardware secrets'
              USING ERRCODE = '42501';
    END IF;

    v_secret := public.gen_random_bytes(32);
    v_secret_hex := encode(v_secret, 'hex');

    UPDATE public.hardware_nodes
       SET hmac_secret = v_secret,
           updated_at = NOW()
     WHERE id = p_node_id
       AND coop_id = v_coop_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RAISE EXCEPTION 'Hardware node % not found for this cooperative', p_node_id
              USING ERRCODE = '02000';
    END IF;

    RETURN v_secret_hex;
END;
$$;

REVOKE ALL ON FUNCTION app.rotate_hardware_node_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.rotate_hardware_node_secret(TEXT) TO authenticated;

COMMENT ON FUNCTION app.rotate_hardware_node_secret(TEXT) IS
    'Replaces the HMAC secret on an existing hardware_nodes row, returns the '
    'new 64-char hex string. The old secret is destroyed; the device must '
    'be re-paired immediately (set-secret <hex> on the serial shell).';
