export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      custom_oauth_providers: {
        Row: {
          acceptable_client_ids: string[]
          attribute_mapping: Json
          authorization_params: Json
          authorization_url: string | null
          cached_discovery: Json | null
          client_id: string
          client_secret: string
          created_at: string
          custom_claims_allowlist: string[]
          discovery_cached_at: string | null
          discovery_url: string | null
          email_optional: boolean
          enabled: boolean
          id: string
          identifier: string
          issuer: string | null
          jwks_uri: string | null
          name: string
          pkce_enabled: boolean
          provider_type: string
          scopes: string[]
          skip_nonce_check: boolean
          token_url: string | null
          updated_at: string
          userinfo_url: string | null
        }
        Insert: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id: string
          client_secret: string
          created_at?: string
          custom_claims_allowlist?: string[]
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier: string
          issuer?: string | null
          jwks_uri?: string | null
          name: string
          pkce_enabled?: boolean
          provider_type: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Update: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id?: string
          client_secret?: string
          created_at?: string
          custom_claims_allowlist?: string[]
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier?: string
          issuer?: string | null
          jwks_uri?: string | null
          name?: string
          pkce_enabled?: boolean
          provider_type?: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string | null
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string | null
          email_optional: boolean
          id: string
          invite_token: string | null
          linking_target_id: string | null
          oauth_client_state_id: string | null
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          referrer: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id?: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          last_webauthn_challenge_data: Json | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_code_sets: {
        Row: {
          created_at: string
          failed_verification_count: number
          id: string
          mfa_factor_id: string
          updated_at: string
          user_id: string
          verification_locked_until: string | null
        }
        Insert: {
          created_at?: string
          failed_verification_count?: number
          id: string
          mfa_factor_id: string
          updated_at?: string
          user_id: string
          verification_locked_until?: string | null
        }
        Update: {
          created_at?: string
          failed_verification_count?: number
          id?: string
          mfa_factor_id?: string
          updated_at?: string
          user_id?: string
          verification_locked_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_recovery_code_sets_mfa_factor_id_fkey"
            columns: ["mfa_factor_id"]
            isOneToOne: true
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mfa_recovery_code_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          consumed_at: string | null
          created_at: string
          id: string
          mfa_recovery_code_set_id: string
        }
        Insert: {
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          id: string
          mfa_recovery_code_set_id: string
        }
        Update: {
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          id?: string
          mfa_recovery_code_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_recovery_codes_mfa_recovery_code_set_id_fkey"
            columns: ["mfa_recovery_code_set_id"]
            isOneToOne: false
            referencedRelation: "mfa_recovery_code_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorizations: {
        Row: {
          approved_at: string | null
          authorization_code: string | null
          authorization_id: string
          client_id: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string
          expires_at: string
          id: string
          nonce: string | null
          redirect_uri: string
          resource: string | null
          response_type: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state: string | null
          status: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id: string
          client_id: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id: string
          nonce?: string | null
          redirect_uri: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id?: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string | null
          redirect_uri?: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope?: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_client_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Insert: {
          code_verifier?: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          id?: string
          provider_type?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_name: string | null
          client_secret_hash: string | null
          client_type: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri: string | null
          created_at: string
          deleted_at: string | null
          grant_types: string
          id: string
          logo_uri: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types: string
          id: string
          logo_uri?: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types?: string
          id?: string
          logo_uri?: string | null
          redirect_uris?: string
          registration_type?: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_consents: {
        Row: {
          client_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          scopes: string
          user_id: string
        }
        Insert: {
          client_id: string
          granted_at?: string
          id: string
          revoked_at?: string | null
          scopes: string
          user_id: string
        }
        Update: {
          client_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            isOneToOne: false
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      scim_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          prefix: string
          revoked_at: string | null
          sso_provider_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id: string
          last_used_at?: string | null
          prefix: string
          revoked_at?: string | null
          sso_provider_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          prefix?: string
          revoked_at?: string | null
          sso_provider_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "scim_tokens_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      scim_users: {
        Row: {
          active: boolean
          created_at: string
          deleted_at: string | null
          external_id: string | null
          id: string
          resource: Json
          sso_provider_id: string
          updated_at: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          external_id?: string | null
          id: string
          resource: Json
          sso_provider_id: string
          updated_at?: string
          user_id?: string | null
          user_name?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          resource?: Json
          sso_provider_id?: string
          updated_at?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "scim_users_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scim_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown
          not_after: string | null
          oauth_client_id: string | null
          refresh_token_counter: number | null
          refresh_token_hmac_key: string | null
          refreshed_at: string | null
          scopes: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_oauth_client_id_fkey"
            columns: ["oauth_client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          disabled: boolean | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          session_data: Json
          user_id: string | null
        }
        Insert: {
          challenge_type: string
          created_at?: string
          expires_at: string
          id?: string
          session_data: Json
          user_id?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_data?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          aaguid: string | null
          attestation_type: string
          backed_up: boolean
          backup_eligible: boolean
          created_at: string
          credential_id: string
          friendly_name: string
          id: string
          last_used_at: string | null
          public_key: string
          sign_count: number
          transports: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id?: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: { Args: never; Returns: string }
      jwt: { Args: never; Returns: Json }
      role: { Args: never; Returns: string }
      uid: { Args: never; Returns: string }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone" | "recovery_code"
      oauth_authorization_status: "pending" | "approved" | "denied" | "expired"
      oauth_client_type: "public" | "confidential"
      oauth_registration_type: "dynamic" | "manual"
      oauth_response_type: "code"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          added_at: string | null
          added_by: string | null
          email: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          email: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          email?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          feature: string
          id: number
          input_tokens: number
          model: string
          output_tokens: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature: string
          id?: number
          input_tokens?: number
          model: string
          output_tokens?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature?: string
          id?: number
          input_tokens?: number
          model?: string
          output_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: boolean
          superadmin_email: string
        }
        Insert: {
          id?: boolean
          superadmin_email: string
        }
        Update: {
          id?: boolean
          superadmin_email?: string
        }
        Relationships: []
      }
      entity_contributors: {
        Row: {
          added_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_public: boolean
          title_label: string | null
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_public?: boolean
          title_label?: string | null
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_public?: boolean
          title_label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feed_post_attachments: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          post_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          post_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_comments: {
        Row: {
          author_organisation_id: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_organisation_id?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_organisation_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_comments_author_organisation_id_fkey"
            columns: ["author_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_comments_author_organisation_id_fkey"
            columns: ["author_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_comments_author_organisation_id_fkey"
            columns: ["author_organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_organisation_id: string | null
          content: string
          created_at: string
          created_by: string
          entity_id: string | null
          entity_type: string | null
          id: string
          published_at: string
          visibility: string
        }
        Insert: {
          author_organisation_id?: string | null
          content: string
          created_at?: string
          created_by: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          published_at?: string
          visibility?: string
        }
        Update: {
          author_organisation_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          published_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_author_organisation_id_fkey"
            columns: ["author_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_author_organisation_id_fkey"
            columns: ["author_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_author_organisation_id_fkey"
            columns: ["author_organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_edges: {
        Row: {
          created_at: string
          follower_user_id: string
          id: string
          target_issue_id: string | null
          target_org_id: string | null
          target_person_id: string | null
          target_project_id: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          id?: string
          target_issue_id?: string | null
          target_org_id?: string | null
          target_person_id?: string | null
          target_project_id?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          id?: string
          target_issue_id?: string | null
          target_org_id?: string | null
          target_person_id?: string | null
          target_project_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_edges_target_issue_id_fkey"
            columns: ["target_issue_id"]
            isOneToOne: false
            referencedRelation: "watchdog_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_edges_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_edges_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_edges_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_edges_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_edges_target_project_id_fkey"
            columns: ["target_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_edges_target_project_id_fkey"
            columns: ["target_project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      grants: {
        Row: {
          amount_max: number | null
          amount_min: number | null
          application_url: string
          approved_at: string | null
          approved_by: string | null
          contact_email: string | null
          created_at: string
          created_by: string
          currency: string
          deadline: string | null
          decision_date: string | null
          description: string | null
          eligible_countries: string[] | null
          eligible_regions: string[] | null
          funder_name: string | null
          funder_website: string | null
          funding_type: string
          id: string
          is_published: boolean
          keywords: string[] | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          moderation_status: string
          notes_internal: string | null
          open_date: string | null
          owner_id: string
          owner_type: string
          project_type: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remote_ok: boolean
          sdgs: number[] | null
          slug: string
          source: string | null
          start_date: string | null
          status: string
          summary: string | null
          themes: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          amount_max?: number | null
          amount_min?: number | null
          application_url: string
          approved_at?: string | null
          approved_by?: string | null
          contact_email?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deadline?: string | null
          decision_date?: string | null
          description?: string | null
          eligible_countries?: string[] | null
          eligible_regions?: string[] | null
          funder_name?: string | null
          funder_website?: string | null
          funding_type: string
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          moderation_status?: string
          notes_internal?: string | null
          open_date?: string | null
          owner_id: string
          owner_type: string
          project_type: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remote_ok?: boolean
          sdgs?: number[] | null
          slug: string
          source?: string | null
          start_date?: string | null
          status?: string
          summary?: string | null
          themes?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          amount_max?: number | null
          amount_min?: number | null
          application_url?: string
          approved_at?: string | null
          approved_by?: string | null
          contact_email?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deadline?: string | null
          decision_date?: string | null
          description?: string | null
          eligible_countries?: string[] | null
          eligible_regions?: string[] | null
          funder_name?: string | null
          funder_website?: string | null
          funding_type?: string
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          moderation_status?: string
          notes_internal?: string | null
          open_date?: string | null
          owner_id?: string
          owner_type?: string
          project_type?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remote_ok?: boolean
          sdgs?: number[] | null
          slug?: string
          source?: string | null
          start_date?: string | null
          status?: string
          summary?: string | null
          themes?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      iati_sync_runs: {
        Row: {
          error: string | null
          fetched: number
          finished_at: string | null
          high_water_mark: string | null
          id: number
          in_scope: number | null
          mode: string
          ok: boolean | null
          started_at: string
          upserted: number
          withdrawn: number
        }
        Insert: {
          error?: string | null
          fetched?: number
          finished_at?: string | null
          high_water_mark?: string | null
          id?: number
          in_scope?: number | null
          mode: string
          ok?: boolean | null
          started_at?: string
          upserted?: number
          withdrawn?: number
        }
        Update: {
          error?: string | null
          fetched?: number
          finished_at?: string | null
          high_water_mark?: string | null
          id?: number
          in_scope?: number | null
          mode?: string
          ok?: boolean | null
          started_at?: string
          upserted?: number
          withdrawn?: number
        }
        Relationships: []
      }
      ifrc_challenges: {
        Row: {
          code: string | null
          id: number
          name: string
        }
        Insert: {
          code?: string | null
          id?: number
          name: string
        }
        Update: {
          code?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organisation_member_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string | null
          organisation_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organisation_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organisation_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_member_requests_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_member_requests_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_member_requests_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          can_create_funding: boolean
          can_create_issues: boolean
          can_create_projects: boolean
          can_manage_members: boolean
          can_post_feed: boolean
          created_at: string | null
          organisation_id: string
          role: string
          user_id: string
        }
        Insert: {
          can_create_funding?: boolean
          can_create_issues?: boolean
          can_create_projects?: boolean
          can_manage_members?: boolean
          can_post_feed?: boolean
          created_at?: string | null
          organisation_id: string
          role: string
          user_id: string
        }
        Update: {
          can_create_funding?: boolean
          can_create_issues?: boolean
          can_create_projects?: boolean
          can_manage_members?: boolean
          can_post_feed?: boolean
          created_at?: string | null
          organisation_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_updates: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          organisation_id: string
          published_at: string
          title: string
          visibility: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          organisation_id: string
          published_at?: string
          title: string
          visibility?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          organisation_id?: string
          published_at?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_updates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_updates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_updates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_verification_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          evidence: Json
          id: string
          organisation_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          organisation_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          organisation_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_verification_submissions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_verification_submissions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_verification_submissions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          annual_report_url: string | null
          based_in_country: string | null
          based_in_region: string | null
          contact_email: string | null
          country: string | null
          country_based: string | null
          created_at: string | null
          created_by: string | null
          demographic_tags: string[] | null
          description: string | null
          existing_since: string | null
          founded_at: string | null
          founded_year: number | null
          funding_needed: number | null
          id: string
          intervention_tags: string[] | null
          lat: number | null
          legal_form: string | null
          lng: number | null
          logo_url: string | null
          looking_for: string[]
          name: string
          registration_country: string | null
          registration_number: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          social_links: Json | null
          thematic_tags: string[] | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
          what_we_do: string | null
        }
        Insert: {
          annual_report_url?: string | null
          based_in_country?: string | null
          based_in_region?: string | null
          contact_email?: string | null
          country?: string | null
          country_based?: string | null
          created_at?: string | null
          created_by?: string | null
          demographic_tags?: string[] | null
          description?: string | null
          existing_since?: string | null
          founded_at?: string | null
          founded_year?: number | null
          funding_needed?: number | null
          id?: string
          intervention_tags?: string[] | null
          lat?: number | null
          legal_form?: string | null
          lng?: number | null
          logo_url?: string | null
          looking_for?: string[]
          name: string
          registration_country?: string | null
          registration_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          social_links?: Json | null
          thematic_tags?: string[] | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          what_we_do?: string | null
        }
        Update: {
          annual_report_url?: string | null
          based_in_country?: string | null
          based_in_region?: string | null
          contact_email?: string | null
          country?: string | null
          country_based?: string | null
          created_at?: string | null
          created_by?: string | null
          demographic_tags?: string[] | null
          description?: string | null
          existing_since?: string | null
          founded_at?: string | null
          founded_year?: number | null
          funding_needed?: number | null
          id?: string
          intervention_tags?: string[] | null
          lat?: number | null
          legal_form?: string | null
          lng?: number | null
          logo_url?: string | null
          looking_for?: string[]
          name?: string
          registration_country?: string | null
          registration_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          social_links?: Json | null
          thematic_tags?: string[] | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          what_we_do?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_based: string | null
          country_from: string | null
          created_at: string | null
          date_of_birth: string | null
          email_notifications_enabled: boolean
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          kind: string
          last_name: string | null
          nationality: string | null
          occupation: string | null
          organisation_id: string | null
          organisation_name: string | null
          role: string
          social_links: Json | null
          surname: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_based?: string | null
          country_from?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email_notifications_enabled?: boolean
          first_name?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          kind?: string
          last_name?: string | null
          nationality?: string | null
          occupation?: string | null
          organisation_id?: string | null
          organisation_name?: string | null
          role?: string
          social_links?: Json | null
          surname?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_based?: string | null
          country_from?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email_notifications_enabled?: boolean
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          kind?: string
          last_name?: string | null
          nationality?: string | null
          occupation?: string | null
          organisation_id?: string | null
          organisation_name?: string | null
          role?: string
          social_links?: Json | null
          surname?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          created_at: string
          created_by: string | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_ifrc_challenges: {
        Row: {
          challenge_id: number
          project_id: string
        }
        Insert: {
          challenge_id: number
          project_id: string
        }
        Update: {
          challenge_id?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_ifrc_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "ifrc_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_ifrc_challenges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_ifrc_challenges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_links: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          project_id: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          project_id?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          project_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_media: {
        Row: {
          caption: string | null
          created_at: string | null
          created_by: string | null
          id: string
          mime_type: string | null
          path: string
          project_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          mime_type?: string | null
          path: string
          project_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          mime_type?: string | null
          path?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_partners: {
        Row: {
          organisation_id: string
          project_id: string
        }
        Insert: {
          organisation_id: string
          project_id: string
        }
        Update: {
          organisation_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_partners_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_partners_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_partners_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_partners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_partners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_posts: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          project_id: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sdgs: {
        Row: {
          project_id: string
          sdg_id: number
        }
        Insert: {
          project_id: string
          sdg_id: number
        }
        Update: {
          project_id?: string
          sdg_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_sdgs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sdgs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sdgs_sdg_id_fkey"
            columns: ["sdg_id"]
            isOneToOne: false
            referencedRelation: "sdgs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tags: {
        Row: {
          added_by: string
          created_at: string
          project_id: string
          tag_id: string
        }
        Insert: {
          added_by: string
          created_at?: string
          project_id: string
          tag_id: string
        }
        Update: {
          added_by?: string
          created_at?: string
          project_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          project_id: string
          published_at: string
          title: string
          visibility: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          project_id: string
          published_at?: string
          title: string
          visibility?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          published_at?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          amount_needed: number | null
          approved_at: string | null
          approved_by: string | null
          category: string
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          donations_received: number | null
          end_date: string | null
          iati_identifier: string | null
          id: string
          ifrc_global_challenges: string[] | null
          intervention_type: string | null
          lat: number | null
          lead_org_id: string | null
          lifecycle_status: string
          links: Json | null
          lives_improved: number | null
          lng: number | null
          name: string
          owner_id: string
          owner_type: string
          partner_org_ids: string[] | null
          place_name: string | null
          point_precision: string | null
          region: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          review_status: string
          sdgs: string[] | null
          slug: string | null
          source: string
          source_data: Json | null
          source_updated_at: string | null
          start_date: string | null
          status: string
          target_demographic: string | null
          target_demographics: string[] | null
          thematic_area: string[] | null
          type_of_intervention: string[] | null
          visibility: string | null
        }
        Insert: {
          amount_needed?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          donations_received?: number | null
          end_date?: string | null
          iati_identifier?: string | null
          id?: string
          ifrc_global_challenges?: string[] | null
          intervention_type?: string | null
          lat?: number | null
          lead_org_id?: string | null
          lifecycle_status?: string
          links?: Json | null
          lives_improved?: number | null
          lng?: number | null
          name: string
          owner_id: string
          owner_type: string
          partner_org_ids?: string[] | null
          place_name?: string | null
          point_precision?: string | null
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          review_status?: string
          sdgs?: string[] | null
          slug?: string | null
          source?: string
          source_data?: Json | null
          source_updated_at?: string | null
          start_date?: string | null
          status?: string
          target_demographic?: string | null
          target_demographics?: string[] | null
          thematic_area?: string[] | null
          type_of_intervention?: string[] | null
          visibility?: string | null
        }
        Update: {
          amount_needed?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          donations_received?: number | null
          end_date?: string | null
          iati_identifier?: string | null
          id?: string
          ifrc_global_challenges?: string[] | null
          intervention_type?: string | null
          lat?: number | null
          lead_org_id?: string | null
          lifecycle_status?: string
          links?: Json | null
          lives_improved?: number | null
          lng?: number | null
          name?: string
          owner_id?: string
          owner_type?: string
          partner_org_ids?: string[] | null
          place_name?: string | null
          point_precision?: string | null
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          review_status?: string
          sdgs?: string[] | null
          slug?: string | null
          source?: string
          source_data?: Json | null
          source_updated_at?: string | null
          start_date?: string | null
          status?: string
          target_demographic?: string | null
          target_demographics?: string[] | null
          thematic_area?: string[] | null
          type_of_intervention?: string[] | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_lead_org_id_fkey"
            columns: ["lead_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_org_id_fkey"
            columns: ["lead_org_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_org_id_fkey"
            columns: ["lead_org_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      sdgs: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      tag_requests: {
        Row: {
          created_at: string
          id: string
          label: string
          project_id: string | null
          reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tag_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          project_id?: string | null
          reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tag_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          project_id?: string | null
          reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "rejected_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_requests_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          iati_codes: string[]
          id: string
          label: string
          origin: string
          slug: string
        }
        Insert: {
          created_at?: string
          iati_codes?: string[]
          id?: string
          label: string
          origin: string
          slug: string
        }
        Update: {
          created_at?: string
          iati_codes?: string[]
          id?: string
          label?: string
          origin?: string
          slug?: string
        }
        Relationships: []
      }
      update_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          update_id: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          update_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          update_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      update_likes: {
        Row: {
          created_at: string
          id: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          update_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      watchdog_issue_updates: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          issue_id: string
          published_at: string
          title: string
          visibility: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          issue_id: string
          published_at?: string
          title: string
          visibility?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          issue_id?: string
          published_at?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchdog_issue_updates_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "watchdog_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      watchdog_issues: {
        Row: {
          affected_demographics: string[]
          affected_groups_text: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          contact_allowed: boolean
          country: string | null
          created_at: string
          created_by: string
          date_observed: string | null
          description: string
          desired_outcome: string | null
          evidence_links: string[]
          global_challenges: string[]
          id: string
          latitude: number
          longitude: number
          owner_id: string
          owner_type: string
          region: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          reporter_anonymous: boolean
          sdgs: number[]
          status: string
          title: string
          updated_at: string
          urgency: number
        }
        Insert: {
          affected_demographics?: string[]
          affected_groups_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_allowed?: boolean
          country?: string | null
          created_at?: string
          created_by: string
          date_observed?: string | null
          description: string
          desired_outcome?: string | null
          evidence_links?: string[]
          global_challenges?: string[]
          id?: string
          latitude: number
          longitude: number
          owner_id: string
          owner_type: string
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reporter_anonymous?: boolean
          sdgs?: number[]
          status?: string
          title: string
          updated_at?: string
          urgency?: number
        }
        Update: {
          affected_demographics?: string[]
          affected_groups_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          contact_allowed?: boolean
          country?: string | null
          created_at?: string
          created_by?: string
          date_observed?: string | null
          description?: string
          desired_outcome?: string | null
          evidence_links?: string[]
          global_challenges?: string[]
          id?: string
          latitude?: number
          longitude?: number
          owner_id?: string
          owner_type?: string
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reporter_anonymous?: boolean
          sdgs?: number[]
          status?: string
          title?: string
          updated_at?: string
          urgency?: number
        }
        Relationships: []
      }
    }
    Views: {
      activity_feed_items: {
        Row: {
          actor_user_id: string | null
          created_at: string | null
          event_type: string | null
          grant_id: string | null
          id: string | null
          issue_id: string | null
          org_id: string | null
          person_profile_id: string | null
          project_id: string | null
          summary: string | null
          title: string | null
          update_id: string | null
        }
        Relationships: []
      }
      organisations_directory_v1: {
        Row: {
          age_years: number | null
          based_in_country: string | null
          based_in_region: string | null
          demographic_tags: string[] | null
          description: string | null
          followers_count: number | null
          founded_at: string | null
          funding_needed: number | null
          id: string | null
          intervention_tags: string[] | null
          lat: number | null
          lng: number | null
          name: string | null
          projects_ongoing_count: number | null
          projects_total_count: number | null
          thematic_tags: string[] | null
          website: string | null
        }
        Relationships: []
      }
      rejected_projects: {
        Row: {
          amount_needed: number | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          donations_received: number | null
          end_date: string | null
          id: string | null
          ifrc_global_challenges: string[] | null
          intervention_type: string | null
          lat: number | null
          lead_org_id: string | null
          lifecycle_status: string | null
          links: Json | null
          lives_improved: number | null
          lng: number | null
          name: string | null
          partner_org_ids: string[] | null
          place_name: string | null
          region: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          review_status: string | null
          sdgs: string[] | null
          slug: string | null
          start_date: string | null
          status: string | null
          target_demographic: string | null
          target_demographics: string[] | null
          thematic_area: string[] | null
          type_of_intervention: string[] | null
        }
        Insert: {
          amount_needed?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          donations_received?: number | null
          end_date?: string | null
          id?: string | null
          ifrc_global_challenges?: string[] | null
          intervention_type?: string | null
          lat?: number | null
          lead_org_id?: string | null
          lifecycle_status?: string | null
          links?: Json | null
          lives_improved?: number | null
          lng?: number | null
          name?: string | null
          partner_org_ids?: string[] | null
          place_name?: string | null
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          review_status?: string | null
          sdgs?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          target_demographic?: string | null
          target_demographics?: string[] | null
          thematic_area?: string[] | null
          type_of_intervention?: string[] | null
        }
        Update: {
          amount_needed?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          donations_received?: number | null
          end_date?: string | null
          id?: string | null
          ifrc_global_challenges?: string[] | null
          intervention_type?: string | null
          lat?: number | null
          lead_org_id?: string | null
          lifecycle_status?: string | null
          links?: Json | null
          lives_improved?: number | null
          lng?: number | null
          name?: string | null
          partner_org_ids?: string[] | null
          place_name?: string | null
          region?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          review_status?: string | null
          sdgs?: string[] | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          target_demographic?: string | null
          target_demographics?: string[] | null
          thematic_area?: string[] | null
          type_of_intervention?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_lead_org_id_fkey"
            columns: ["lead_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_org_id_fkey"
            columns: ["lead_org_id"]
            isOneToOne: false
            referencedRelation: "organisations_directory_v1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_org_id_fkey"
            columns: ["lead_org_id"]
            isOneToOne: false
            referencedRelation: "verified_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_organisations: {
        Row: {
          id: string | null
          name: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_project_collaborator_by_email: {
        Args: { email: string; pid: string; role: string }
        Returns: string
      }
      can_admin_projects: { Args: never; Returns: boolean }
      create_notification: {
        Args: {
          body: string
          href: string
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Returns: string
      }
      create_project_submission: {
        Args: {
          p_amount_needed: number
          p_currency: string
          p_description: string
          p_donations_received: number
          p_end_date: string
          p_ifrc_ids: number[]
          p_lat: number
          p_lead_org_id: string
          p_links: Json
          p_lives_improved: number
          p_lng: number
          p_name: string
          p_owner_id: string
          p_owner_type: string
          p_partner_org_ids: string[]
          p_place_name: string
          p_sdg_ids: number[]
          p_start_date: string
          p_target_demographic: string
          p_thematic_area: string[]
          p_type_of_intervention: string[]
        }
        Returns: {
          id: string
          status: string
        }[]
      }
      generate_project_slug: {
        Args: { project_id: string; project_name: string }
        Returns: string
      }
      get_activity_feed_items: {
        Args: {
          cursor_created_at?: string
          cursor_id?: string
          page_size?: number
          scope: string
        }
        Returns: {
          actor_user_id: string
          created_at: string
          event_type: string
          grant_id: string
          id: string
          issue_id: string
          org_id: string
          person_profile_id: string
          project_id: string
          summary: string
          title: string
          update_id: string
        }[]
      }
      get_home_stats: {
        Args: never
        Returns: {
          funding_funders_registered: number
          funding_open_calls: number
          funding_opportunities_total: number
          issues_issues_open: number
          issues_issues_total: number
          projects_donations_received_eur: number
          projects_organisations_registered: number
          projects_projects_approved: number
          projects_projects_ongoing: number
          updated_at: string
        }[]
      }
      get_project_collaborators: {
        Args: { pid: string }
        Returns: {
          created_at: string
          created_by: string
          email: string
          full_name: string
          organisation_name: string
          role: string
          user_id: string
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { uid: string }; Returns: boolean }
      is_admin_email: { Args: { e: string }; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      is_org_admin_can_manage_members: {
        Args: { _org_id: string }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      is_superadmin_email: { Args: { e: string }; Returns: boolean }
      listed_project_counts: {
        Args: { org_id: string }
        Returns: {
          ongoing: number
          total: number
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: { Args: { nid: string }; Returns: undefined }
      remove_project_collaborator: {
        Args: { pid: string; target_id: string }
        Returns: string
      }
      slugify_project_name: { Args: { project_name: string }; Returns: string }
      user_can_edit_project: { Args: { pid: string }; Returns: boolean }
      user_can_view_project: { Args: { pid: string }; Returns: boolean }
      user_can_view_project_private: { Args: { pid: string }; Returns: boolean }
    }
    Enums: {
      project_approval_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          lifecycle_configuration: Json | null
          lifecycle_configuration_generation: string | null
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          lifecycle_configuration?: Json | null
          lifecycle_configuration_generation?: string | null
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          lifecycle_configuration?: Json | null
          lifecycle_configuration_generation?: string | null
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: { delete_markers?: string; noncurrent_versions?: string }
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
          raw_prefix_param?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delete_markers?: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          next_token_archived_at?: string
          next_token_version?: string
          noncurrent_versions?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          delete_markers?: string
          levels?: number
          limits?: number
          noncurrent_versions?: string
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          delete_markers?: string
          noncurrent_versions?: string
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
          p_start_after_version?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          delete_markers?: string
          levels?: number
          limits?: number
          noncurrent_versions?: string
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
          start_after_archived_at?: string
          start_after_is_continuation?: boolean
          start_after_version?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone", "recovery_code"],
      oauth_authorization_status: ["pending", "approved", "denied", "expired"],
      oauth_client_type: ["public", "confidential"],
      oauth_registration_type: ["dynamic", "manual"],
      oauth_response_type: ["code"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
  public: {
    Enums: {
      project_approval_status: ["pending", "approved", "rejected"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

