# Encryption Standards

**Document Version:** 1.0  
**Effective Date:** January 2025  
**Owner:** Security Team  
**Review Schedule:** Annual  
**SOC-2 Controls:** CC6.1, CC6.7

## 1. Purpose and Scope

### 1.1 Purpose

This document establishes encryption standards for protecting data confidentiality and integrity throughout its lifecycle. The standards ensure compliance with Canadian privacy laws (PIPEDA, provincial privacy acts) and industry best practices for cryptographic protection.

### 1.2 Scope

This standard applies to:

- All data classifications (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED)
- All data states (at rest, in transit, in use)
- All system components (applications, databases, APIs, storage, backups)
- All cryptographic operations (encryption, hashing, digital signatures)
- All organizational levels and users

## 2. Encryption Requirements by Data Classification

### 2.1 Summary Table

| Classification | At Rest | In Transit | Key Management | Minimum Standard |
|----------------|---------|------------|----------------|------------------|
| PUBLIC | Optional | Optional | N/A | N/A |
| INTERNAL | Provider-managed | TLS 1.2+ | Cloud KMS | AES-256 |
| CONFIDENTIAL | AES-256 | TLS 1.3 | Azure Key Vault | AES-256-GCM |
| RESTRICTED | AES-256-GCM + HSM keys | TLS 1.3 + Cert Pinning | Azure Dedicated HSM | AES-256-GCM |

### 2.2 Detailed Requirements

#### 2.2.1 PUBLIC Data

- **Encryption**: Not required (data intended for public disclosure)
- **Integrity Protection**: Optional (checksums for file integrity)
- **Use Cases**: Public website content, marketing materials

#### 2.2.2 INTERNAL Data

- **Encryption at Rest**:
  - Cloud provider managed encryption (Azure Storage Service Encryption)
  - Minimum AES-256
- **Encryption in Transit**:
  - TLS 1.2 or higher
  - Strong cipher suites only (see section 3.2)
- **Key Management**: Cloud provider KMS (Azure Key Vault - software keys)

#### 2.2.3 CONFIDENTIAL Data

- **Encryption at Rest**:
  - AES-256-GCM (Galois/Counter Mode for authenticated encryption)
  - Column-level encryption for sensitive fields (e.g., SIN, banking info)
- **Encryption in Transit**:
  - TLS 1.3 mandatory
  - Perfect Forward Secrecy (PFS) required
  - Certificate pinning for API clients
- **Key Management**:
  - Azure Key Vault (customer-managed keys)
  - Key rotation every 90 days
  - Key usage audit logging

#### 2.2.4 RESTRICTED Data

- **Encryption at Rest**:
  - AES-256-GCM with hardware-backed keys (HSM)
  - Transparent Data Encryption (TDE) for databases
  - Field-level encryption for maximum sensitivity fields
- **Encryption in Transit**:
  - TLS 1.3 with mutual authentication (mTLS)
  - Certificate pinning mandatory
  - No downgrade to TLS 1.2 allowed
- **Key Management**:
  - Azure Dedicated HSM (FIPS 140-2 Level 3)
  - Key rotation every 30 days
  - Dual authorization for key operations
  - Hardware-backed key generation

## 3. Encryption in Transit

### 3.1 TLS/SSL Configuration

**Mandatory TLS Versions**:

- **TLS 1.3**: Required for CONFIDENTIAL and RESTRICTED data
- **TLS 1.2**: Minimum for INTERNAL data (with approved cipher suites)
- **TLS 1.1 and below**: Disabled (deprecated, insecure)

**Cipher Suite Priority** (TLS 1.3):

```
TLS_AES_256_GCM_SHA384 (Preferred)
TLS_AES_128_GCM_SHA256
TLS_CHACHA20_POLY1305_SHA256
```

**Cipher Suite Priority** (TLS 1.2 for backward compatibility):

```
ECDHE-RSA-AES256-GCM-SHA384
ECDHE-RSA-AES128-GCM-SHA256
DHE-RSA-AES256-GCM-SHA384
DHE-RSA-AES128-GCM-SHA256
```

**Disabled Cipher Suites** (known weaknesses):

- RC4, DES, 3DES (weak ciphers)
- MD5, SHA1 (weak hashes)
- NULL, EXPORT, ANON (no encryption/authentication)
- CBC mode ciphers (vulnerable to padding oracle attacks)

### 3.2 Certificate Management

**Certificate Authority (CA)**:

- **Production**: Public CA (Let's Encrypt, DigiCert)
- **Internal Services**: Internal CA (Azure AD Certificate Services)
- **Development**: Self-signed acceptable (with proper warnings)

**Certificate Requirements**:

- **Key Size**: Minimum 2048-bit RSA or 256-bit ECC
- **Hash Algorithm**: SHA-256 or stronger (SHA-384, SHA-512)
- **Validity Period**: Maximum 397 days (per CA/Browser Forum baseline)
- **Subject Alternative Names (SAN)**: Include all DNS names

**Certificate Lifecycle**:

1. **Generation**: CSR generated with approved key size and hash
2. **Validation**: Domain validation (DV) minimum, organization validation (OV) preferred
3. **Installation**: Install with full certificate chain
4. **Monitoring**: Automated expiration alerts (30, 14, 7 days)
5. **Renewal**: Renew 30 days before expiration (automated via cert-manager)
6. **Revocation**: Immediate revocation on private key compromise

**Certificate Pinning**:

- **Scope**: Mobile apps, API clients, critical services
- **Method**: Pin certificate public key (SPKI hash)
- **Backup Pins**: Include 1-2 backup pins for rotation
- **Update Process**: Mobile app updates include new pins (6-month lead time)

### 3.3 Protocol-Specific Encryption

**HTTPS (Web Applications)**:

- TLS 1.3 for all user-facing pages
- HSTS (HTTP Strict Transport Security) enabled
  - `max-age=31536000` (1 year)
  - `includeSubDomains`
  - `preload` (submit to browser preload list)
- HTTP/2 or HTTP/3 for performance
- No mixed content (all resources over HTTPS)

**API Communication**:

- RESTful APIs: TLS 1.3 + Bearer tokens (JWT)
- GraphQL: TLS 1.3 + API keys or JWT
- Webhooks: TLS 1.3 + HMAC signature verification
- Rate limiting to prevent brute-force attacks

**Email Encryption**:

- **In Transit**: STARTTLS mandatory (TLS 1.2+)
- **At Rest**: Office 365 Message Encryption (OME)
- **Sensitive Attachments**: Password-protected ZIP or PGP encryption

**Database Connections**:

- **PostgreSQL**: SSL mode `require` or `verify-full`
- **Connection Strings**: Encrypted in secrets manager (Azure Key Vault)
- **Client Certificates**: mTLS for administrative connections

**VPN**:

- **Protocol**: WireGuard or IPSec/IKEv2 (no PPTP, L2TP)
- **Encryption**: AES-256-GCM
- **Authentication**: Certificate-based + MFA

**SSH**:

- **Protocol**: SSH-2 only (SSH-1 disabled)
- **Key Exchange**: curve25519-sha256, ecdh-sha2-nistp256
- **Ciphers**: <aes256-gcm@openssh.com>, <chacha20-poly1305@openssh.com>
- **MACs**: <hmac-sha2-512-etm@openssh.com>
- **Key Authentication**: RSA 4096-bit or Ed25519 (no password authentication)

## 4. Encryption at Rest

### 4.1 Database Encryption

**Transparent Data Encryption (TDE)**:

- **Scope**: All production databases (PostgreSQL, Azure SQL)
- **Method**: TDE encrypts entire database at file level
- **Keys**: Customer-managed keys in Azure Key Vault
- **Performance**: Minimal overhead (<3%)

**Column-Level Encryption** (for high-sensitivity fields):

- **Scope**: RESTRICTED data (SIN, banking info, health records)
- **Method**: Application-level encryption before database insert
- **Algorithm**: AES-256-GCM with per-record unique IV
- **Key Derivation**: HKDF (HMAC-based Key Derivation Function)
- **Libraries**: Node.js `crypto` module (built-in), or libsodium

**Example (TypeScript)**:

```typescript
import crypto from 'crypto';

// Encryption
function encryptField(plaintext: string, dataEncryptionKey: Buffer): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', dataEncryptionKey, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  // Return: iv + authTag + ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

// Decryption
function decryptField(ciphertext: string, dataEncryptionKey: Buffer): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', dataEncryptionKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Field Masking** (display layer):

- SIN: Show last 3 digits only (`XXX-XXX-123`)
- Credit card: Show last 4 digits (`XXXX-XXXX-XXXX-1234`)
- Bank account: Show last 4 digits (`XXXXXX1234`)

### 4.2 File Storage Encryption

**Azure Blob Storage**:

- **Method**: Azure Storage Service Encryption (SSE)
- **Algorithm**: AES-256
- **Keys**: Customer-managed keys in Azure Key Vault
- **Scope**: All storage accounts

**Local File Encryption** (if applicable):

- **Windows**: BitLocker with TPM
- **macOS**: FileVault 2
- **Linux**: LUKS (dm-crypt)
- **Enforcement**: MDM policy (Intune)

**Backup Encryption**:

- **Cloud Backups**: AES-256 (Azure Backup)
- **Offline Backups**: AES-256 with passphrase
- **Key Storage**: Offline keys stored in safe (dual custody)

### 4.3 Application-Level Encryption

**Secrets Management**:

- **Passwords**: Hashed with bcrypt (cost factor 12) - NOT encrypted
- **API Keys**: Encrypted with AES-256-GCM, stored in Azure Key Vault
- **JWT Signing Keys**: RSA-2048 or HMAC-SHA256 (256-bit secret)
- **Encryption Keys**: Never hardcoded (retrieved from Key Vault at runtime)

**Environment Variables**:

- **Production**: Stored in Azure Key Vault, injected at runtime
- **Development**: Stored in `.env` (never committed to git)

**Configuration Files**:

- **Sensitive Config**: Encrypted with ansible-vault or sops (age)
- **Non-Sensitive**: Plain text acceptable

## 5. Key Management

### 5.1 Key Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  Master Encryption Key (MEK)                            │
│  ↓ Stored in Azure Dedicated HSM (FIPS 140-2 Level 3) │
│  ↓ Never leaves HSM                                    │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│  Key Encryption Keys (KEK)                              │
│  ↓ Per-service keys, encrypted by MEK                  │
│  ↓ Stored in Azure Key Vault                           │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│  Data Encryption Keys (DEK)                             │
│  ↓ Per-table/per-file keys, encrypted by KEK           │
│  ↓ Cached in application memory (encrypted at rest)    │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Key Generation

**Randomness Source**:

- **Hardware RNG**: HSM-generated keys (preferred)
- **Software RNG**: OS-level CSPRNG (`/dev/urandom`, CryptGenRandom)
- **Never**: User-chosen passwords as encryption keys (use PBKDF2/bcrypt for key derivation)

**Key Sizes**:

- **Symmetric (AES)**: 256-bit
- **Asymmetric (RSA)**: 2048-bit minimum, 4096-bit preferred
- **Asymmetric (ECC)**: P-256 minimum, P-384 preferred, Ed25519 acceptable
- **Hashing**: SHA-256 minimum

**Key Formats**:

- **Symmetric Keys**: Raw bytes (32 bytes for AES-256)
- **RSA Keys**: PEM format (PKCS#8 for private, X.509 for public)
- **ECC Keys**: PEM format (SEC1/PKCS#8)

### 5.3 Key Storage

**Azure Key Vault** (primary key store):

- **Standard Tier**: Software-protected keys (for INTERNAL/CONFIDENTIAL data)
- **Premium Tier**: HSM-protected keys (for RESTRICTED data)
- **Access Control**: Azure RBAC (role-based access control)
  - Key Officers: Can create/manage keys
  - Applications: Can encrypt/decrypt only (no export)
- **Audit Logging**: All key operations logged to Azure Monitor
- **Backup**: Automatic backups (Azure-managed)

**Hardware Security Modules (HSM)**:

- **Model**: Azure Dedicated HSM (Thales Luna 7)
- **Certification**: FIPS 140-2 Level 3
- **Use Cases**: RESTRICTED data encryption, root CA keys
- **Access**: Dual authorization required for administrative operations

**Key Escrow** (disaster recovery):

- **Scope**: Master encryption keys only
- **Storage**: Physical safe, dual custody (two officers)
- **Format**: Encrypted with split-knowledge (Shamir's Secret Sharing, 3-of-5 threshold)
- **Review**: Annual audit of escrow keys

### 5.4 Key Rotation

**Rotation Schedule**:

| Key Type | Rotation Frequency | Automated |
|----------|-------------------|-----------|
| Master Encryption Key (MEK) | Annually | No (manual, dual auth) |
| Key Encryption Key (KEK) | 90 days (CONFIDENTIAL), 30 days (RESTRICTED) | Yes |
| Data Encryption Key (DEK) | 1 year | Yes |
| TLS Certificates | 12 months | Yes (cert-manager) |
| API Keys | 90 days | Manual |
| SSH Keys | 90 days | Manual |

**Rotation Process** (automated for KEK/DEK):

1. Generate new key version in Azure Key Vault
2. Encrypt new data with new key (immediate)
3. Re-encrypt existing data with new key (background job, gradual)
4. Deprecate old key version (retained for decryption only)
5. Destroy old key version after all data re-encrypted (90-day grace period)

**Emergency Key Rotation**:

- **Trigger**: Key compromise suspected, insider threat, major breach
- **Timeline**: Immediate (within 4 hours)
- **Process**: Generate new key, re-encrypt all data (parallelized), revoke old key

### 5.5 Key Destruction

**Secure Destruction**:

- **Azure Key Vault**: Soft delete enabled (90-day recovery period), then purge
- **HSM Keys**: Cryptographic erasure (overwrite with random data 3 times)
- **Physical Media**: Degauss and physically destroy (shred)
- **Verification**: Certificate of destruction from vendor

**Retention Requirements**:

- **Active Keys**: Retained while data encrypted with them exists
- **Deprecated Keys**: Retained for 90 days after rotation (for decryption of old data)
- **Backup Keys**: Retained for 7 years (compliance requirement)

## 6. Hashing and Integrity

### 6.1 Cryptographic Hash Functions

**Approved Algorithms**:

- **SHA-256**: Minimum standard
- **SHA-384, SHA-512**: Preferred for high-security applications
- **SHA-3**: Acceptable alternative
- **BLAKE2**: Acceptable (high performance)

**Deprecated Algorithms** (do NOT use):

- **MD5**: Collision attacks, cryptographically broken
- **SHA-1**: Collision attacks (SHAttered), deprecated since 2017

### 6.2 Password Hashing

**Algorithm**: bcrypt (preferred) or Argon2id

**bcrypt Parameters**:

- **Cost Factor**: 12 (2^12 = 4096 iterations)
- **Salt**: Automatically generated (per-password unique)
- **Output**: 60-character hash string

**Example (Node.js)**:

```typescript
import bcrypt from 'bcrypt';

// Hash password
const hash = await bcrypt.hash(password, 12);

// Verify password
const isMatch = await bcrypt.compare(password, hash);
```

**Alternative: Argon2id** (memory-hard function):

- **Memory**: 64 MB
- **Iterations**: 3
- **Parallelism**: 4 threads
- **Salt**: 16 bytes (unique per-password)

### 6.3 Message Authentication Codes (MAC)

**HMAC (Hash-based MAC)**:

- **Use Cases**: API request signing, webhook verification, integrity checks
- **Algorithm**: HMAC-SHA256 or HMAC-SHA512
- **Key Size**: 256 bits (32 bytes)
- **Example**: Stripe webhook signature verification

**GMAC (Galois MAC)**:

- **Use Cases**: Authenticated encryption (AES-GCM mode includes GMAC)
- **Advantage**: Parallel computation, high performance

### 6.4 Digital Signatures

**Algorithm**: RSA-PSS (preferred) or ECDSA

**RSA-PSS** (Probabilistic Signature Scheme):

- **Key Size**: 2048-bit minimum, 4096-bit preferred
- **Hash**: SHA-256 or SHA-512
- **Salt Length**: Hash length (32 bytes for SHA-256)

**ECDSA** (Elliptic Curve DSA):

- **Curve**: P-256 (secp256r1) minimum, P-384 or Ed25519 preferred
- **Hash**: SHA-256 (P-256), SHA-384 (P-384)

**Use Cases**:

- PKI digital signature workflow (Task 4 implementation)
- Code signing
- Document signing (collective agreements, contracts)
- Audit log integrity (sign log files)

## 7. Quantum-Safe Cryptography

### 7.1 Quantum Threat Assessment

**Timeline**: NIST estimates quantum computers capable of breaking RSA-2048 within 10-20 years.

**Threat to Current Algorithms**:

- **RSA, ECC, Diffie-Hellman**: Vulnerable to Shor's algorithm (breaks integer factorization, discrete log)
- **AES-128**: Reduced to 64-bit security via Grover's algorithm (still secure if use AES-256)
- **SHA-256, SHA-512**: Quantum-safe (Grover's algorithm has minimal impact on hash functions)

### 7.2 Post-Quantum Readiness

**Current Strategy** (hybrid approach):

1. **Use AES-256** (already quantum-safe for symmetric encryption)
2. **Plan for PQC migration** (post-quantum cryptography algorithms)
3. **Monitor NIST PQC standards** (finalized in 2024)

**NIST PQC Selected Algorithms** (for future adoption):

- **Key Encapsulation**: CRYSTALS-Kyber (lattice-based)
- **Digital Signatures**: CRYSTALS-Dilithium, FALCON, SPHINCS+ (lattice/hash-based)

**Hybrid TLS** (transitional approach):

- Use both classical (RSA/ECC) and PQC algorithms in parallel
- Provides security even if one is broken
- Expected to be supported in TLS 1.3 extensions (2025-2026)

**Action Items**:

- [ ] Monitor Azure Key Vault for PQC key support
- [ ] Test hybrid TLS in non-production (2025)
- [ ] Upgrade long-term secrets (10+ year retention) to PQC (2026)

## 8. Implementation Guidelines

### 8.1 Development Standards

**Secure Coding Practices**:

- Use established crypto libraries (Node.js `crypto`, libsodium) - NEVER implement own crypto
- Validate all crypto inputs (key sizes, IV lengths, plaintext sizes)
- Clear sensitive data from memory after use (`crypto.timingSafeEqual` for comparisons)
- Avoid crypto side-channel attacks (timing attacks, padding oracle)

**Code Review Checklist**:

- [ ] Approved algorithms used (AES-256-GCM, SHA-256+, bcrypt)
- [ ] Keys retrieved from Azure Key Vault (not hardcoded)
- [ ] IVs/nonces randomly generated (not reused)
- [ ] Authentication tags verified (GCM mode)
- [ ] Error messages do not leak crypto info

**Testing**:

- Unit tests for encryption/decryption functions
- Integration tests for key retrieval from Key Vault
- Security scans (SAST/DAST) for crypto vulnerabilities
- Penetration testing of crypto implementations

### 8.2 Operational Procedures

**Key Generation Ceremony** (for high-value keys like root CA):

1. **Preparation**: Document procedure, select participants (dual custody)
2. **Generation**: Use HSM, witness all operations
3. **Backup**: Split key using Shamir's Secret Sharing (3-of-5 threshold)
4. **Storage**: Store shares in separate safes, different locations
5. **Documentation**: Sign ceremony log, retain for audit

**Key Rotation Execution**:

1. Schedule maintenance window (for RESTRICTED data rotation)
2. Generate new key version in Key Vault
3. Update application config to use new key
4. Run re-encryption job (monitor progress)
5. Verify all data re-encrypted (spot checks)
6. Deprecate old key version
7. Update documentation

**Incident Response** (crypto-related):

- Key compromise → Emergency rotation (4-hour SLA)
- Weak algorithm detected → Upgrade to approved algorithm (30-day timeline)
- Vulnerability in crypto library → Patch immediately (same-day deployment)

## 9. Compliance and Audit

### 9.1 Regulatory Requirements

**PIPEDA (Canada)**:

- "Organizations shall protect personal information against loss or theft, as well as unauthorized access, disclosure, copying, use, or modification."
- **Interpretation**: Encryption strongly recommended for CONFIDENTIAL/RESTRICTED data

**PCI-DSS** (Payment Card Industry):

- **Requirement 3.4**: Render PAN (Primary Account Number) unreadable wherever stored
- **Requirement 4.1**: Use strong cryptography for transmitting cardholder data
- **Our Scope**: Limited (Stripe tokenization), but still encrypt last-4 digits

**PHIPA (Ontario health information)**:

- Encryption required for PHI in transit and at rest
- **Our Scope**: `health_wellness_claims` table (RESTRICTED classification)

### 9.2 Audit Requirements

**Key Management Audit** (annual):

- Review key inventory (all keys accounted for?)
- Verify key rotation schedule (on time?)
- Check key access logs (unauthorized access?)
- Validate escrow keys (can be recovered?)

**Encryption Audit** (semi-annual):

- Scan databases for unencrypted CONFIDENTIAL/RESTRICTED data
- Test TLS configurations (ssllabs.com scan)
- Review cipher suites (weak ciphers disabled?)
- Verify certificate expiration monitoring

**Penetration Testing** (annual):

- Attempt to break encryption (should fail)
- Test for crypto side-channels (timing attacks)
- Validate certificate pinning
- Test key compromise scenarios

## 10. Exceptions and Waivers

### 10.1 Exception Process

Exceptions to encryption standards may be granted:

1. **Technical Limitation**: Algorithm not supported on legacy system
2. **Performance**: Encryption causes unacceptable latency (rare with modern hardware)
3. **Cost**: HSM cost prohibitive for low-risk data

**Approval Required**:

- Security Officer (for temporary exceptions <90 days)
- CISO (for extended exceptions <1 year)
- Executive Team (for permanent exceptions)

**Compensating Controls**:

- Enhanced access controls (MFA, IP allowlisting)
- Additional audit logging
- Shorter data retention periods

### 10.2 Legacy System Support

**TLS 1.2 Allowed** (temporary, until 2026):

- **Scope**: Integration with government systems requiring TLS 1.2
- **Compensating Controls**: VPN tunnel, certificate pinning
- **Deadline**: Upgrade to TLS 1.3 by Jan 1, 2026

## 11. Training and Awareness

### 11.1 Mandatory Training

**Developers**:

- Secure coding practices (crypto modules)
- Common crypto vulnerabilities (padding oracle, timing attacks)
- Key management procedures
- **Frequency**: Annual (4 hours)

**IT Operations**:

- Key rotation procedures
- Certificate management
- HSM operations
- **Frequency**: Semi-annual (2 hours)

**All Staff**:

- Data classification and encryption requirements
- Reporting crypto incidents
- **Frequency**: Annual (1 hour)

## 12. Related Standards and Policies

**Internal Policies**:

- **Access Control Policy**: Authentication and authorization
- **Data Classification Policy**: Determines encryption requirements
- **Incident Response Plan**: Crypto incident handling
- **Key Management Policy**: (This document, section 5)

**External Standards**:

- **NIST SP 800-175B**: Guideline for Using Cryptographic Standards
- **NIST SP 800-57**: Recommendation for Key Management
- **FIPS 140-2**: Security Requirements for Cryptographic Modules
- **PCI-DSS**: Payment Card Industry Data Security Standard

## 13. Algorithm Lifecycle

### 13.1 Algorithm Status

| Algorithm | Status | Usage | End-of-Life |
|-----------|--------|-------|-------------|
| AES-256-GCM | Approved | All data | None (quantum-safe) |
| AES-128-GCM | Approved | Non-sensitive data | None |
| ChaCha20-Poly1305 | Approved | Mobile devices | None |
| RSA-2048 | Approved | TLS, signatures | 2030 (quantum threat) |
| RSA-4096 | Approved | Long-term keys | 2035 |
| ECC P-256 | Approved | TLS, signatures | 2030 |
| ECC P-384 | Approved | High security | 2035 |
| Ed25519 | Approved | SSH, signatures | 2030 |
| SHA-256 | Approved | All hashing | None |
| SHA-512 | Approved | High security | None |
| bcrypt | Approved | Passwords | None |
| TLS 1.3 | Approved | All HTTPS | None |
| TLS 1.2 | Deprecated | Legacy only | 2026 |
| SHA-1 | Prohibited | None | 2017 |
| MD5 | Prohibited | None | 2008 |
| 3DES | Prohibited | None | 2023 |
| RC4 | Prohibited | None | 2015 |

### 13.2 Deprecation Process

When algorithm deprecated:

1. **Announcement**: 12-month notice to all stakeholders
2. **Migration Plan**: Document replacement algorithm and timeline
3. **Testing**: Test replacement in non-production
4. **Deployment**: Gradual rollout (10% → 50% → 100%)
5. **Decommission**: Disable deprecated algorithm
6. **Re-encryption**: Migrate existing data (if applicable)

## 14. Glossary

- **AES**: Advanced Encryption Standard (symmetric cipher)
- **DEK**: Data Encryption Key (encrypts data directly)
- **GCM**: Galois/Counter Mode (authenticated encryption)
- **HMAC**: Hash-based Message Authentication Code
- **HSM**: Hardware Security Module (tamper-resistant crypto device)
- **KEK**: Key Encryption Key (encrypts DEKs)
- **MEK**: Master Encryption Key (top of key hierarchy)
- **PFS**: Perfect Forward Secrecy (session keys not compromised if long-term key is)
- **PQC**: Post-Quantum Cryptography (algorithms resistant to quantum attacks)
- **RSA**: Rivest–Shamir–Adleman (asymmetric cipher)
- **TDE**: Transparent Data Encryption (database-level encryption)
- **TLS**: Transport Layer Security (encrypts network traffic)

## 15. Policy Review

Reviewed annually or when:

- New crypto vulnerabilities discovered
- Regulatory changes
- Technology advances (quantum computing)

**Next Review Date**: January 2026

---

**Document Control**

- **Document ID**: STD-ENC-004
- **Version**: 1.0
- **Classification**: INTERNAL USE ONLY
- **Location**: docs/compliance/policies/ENCRYPTION_STANDARDS.md
