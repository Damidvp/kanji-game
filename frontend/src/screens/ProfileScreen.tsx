import { useEffect, useState, type FormEvent } from 'react'
import { TopNav } from '../components/TopNav'
import { Button } from '../components/Button'
import { jlptLevels, type JlptLevelId } from '../mocks/jlptLevels'
import { getObjectiveLevel, setObjectiveLevel } from '../lib/profile'
import { updateObjectiveLevel, updateProfile, isAuthError } from '../lib/auth'
import { getGuestName } from '../lib/guest'
import { useAuth } from '../contexts/AuthContext'
import styles from './ProfileScreen.module.css'

interface EditErrors {
  pseudo?: string
  email?: string
  newPassword?: string
  currentPassword?: string
  form?: string
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function ProfileScreen() {
  const { profile, refreshProfile } = useAuth()
  const [objectiveLevel, setObjectiveLevelState] = useState<JlptLevelId>(getObjectiveLevel)

  // Le profil réel (si connecté) se charge de façon asynchrone après le montage ; une fois
  // arrivé, son objectif JLPT (persisté côté serveur) prend le pas sur celui du localStorage.
  useEffect(() => {
    if (profile?.objectiveLevel) setObjectiveLevelState(profile.objectiveLevel)
  }, [profile?.objectiveLevel])

  function selectGuestObjective(level: JlptLevelId) {
    setObjectiveLevelState(level)
    setObjectiveLevel(level)
  }

  const [editing, setEditing] = useState(false)
  const [editPseudo, setEditPseudo] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editObjectiveLevel, setEditObjectiveLevel] = useState<JlptLevelId>(objectiveLevel)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [editErrors, setEditErrors] = useState<EditErrors>({})
  const [saving, setSaving] = useState(false)

  function startEditing() {
    if (!profile) return
    setEditPseudo(profile.pseudo)
    setEditEmail(profile.email)
    setEditObjectiveLevel(objectiveLevel)
    setNewPassword('')
    setConfirmPassword('')
    setCurrentPassword('')
    setEditErrors({})
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditErrors({})
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    const errors: EditErrors = {}
    if (editPseudo.trim().length < 2) errors.pseudo = 'Au moins 2 caractères.'
    if (!isValidEmail(editEmail)) errors.email = 'Adresse e-mail invalide.'
    if (newPassword && newPassword.length < 8) errors.newPassword = 'Au moins 8 caractères.'
    else if (newPassword && newPassword !== confirmPassword) {
      errors.newPassword = 'Les mots de passe ne correspondent pas.'
    }
    if (!currentPassword) errors.currentPassword = 'Requis pour enregistrer les changements.'
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      await updateProfile({
        pseudo: editPseudo.trim(),
        email: editEmail.trim(),
        currentPassword,
        newPassword: newPassword || undefined,
      })
      if (editObjectiveLevel !== objectiveLevel) {
        await updateObjectiveLevel(editObjectiveLevel)
      }
      await refreshProfile()
      setEditing(false)
    } catch (error) {
      if (isAuthError(error, 401)) {
        setEditErrors({ form: 'Mot de passe actuel incorrect.' })
      } else if (isAuthError(error, 409)) {
        setEditErrors({ form: 'Ce pseudo ou cet e-mail est déjà utilisé.' })
      } else {
        setEditErrors({ form: 'Impossible d’enregistrer. Réessaie dans un instant.' })
      }
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.pseudo ?? getGuestName() ?? 'Invité'
  const initials = displayName.trim().slice(0, 2).toUpperCase()

  return (
    <div>
      <TopNav />
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.headerBody}>
            {editing ? (
              <form className={styles.editForm} onSubmit={saveProfile} noValidate>
                <label className={styles.editLabel} htmlFor="edit-pseudo">
                  Pseudo
                </label>
                <input
                  id="edit-pseudo"
                  className={styles.editInput}
                  value={editPseudo}
                  onChange={(e) => setEditPseudo(e.target.value)}
                />
                {editErrors.pseudo && <div className={styles.editError}>{editErrors.pseudo}</div>}

                <label className={styles.editLabel} htmlFor="edit-email">
                  Adresse e-mail
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className={styles.editInput}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                {editErrors.email && <div className={styles.editError}>{editErrors.email}</div>}

                <label className={styles.editLabel} htmlFor="edit-new-password">
                  Nouveau mot de passe (optionnel)
                </label>
                <input
                  id="edit-new-password"
                  type="password"
                  className={styles.editInput}
                  placeholder="Laisser vide pour ne pas changer"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                {newPassword && (
                  <>
                    <label className={styles.editLabel} htmlFor="edit-confirm-password">
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      id="edit-confirm-password"
                      type="password"
                      className={styles.editInput}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </>
                )}
                {editErrors.newPassword && <div className={styles.editError}>{editErrors.newPassword}</div>}

                <div className={styles.objectiveLabel}>Objectif JLPT</div>
                <div className={styles.chipsRow}>
                  {jlptLevels.map((level) => {
                    const selected = level.id === editObjectiveLevel
                    return (
                      <button
                        key={level.id}
                        type="button"
                        className={styles.chip}
                        style={{
                          borderColor: level.color,
                          background: selected ? level.color : 'transparent',
                          color: selected ? '#fff' : level.color,
                        }}
                        onClick={() => setEditObjectiveLevel(level.id)}
                      >
                        {level.id}
                      </button>
                    )
                  })}
                </div>

                <label className={styles.editLabel} htmlFor="edit-current-password">
                  Mot de passe actuel (pour confirmer)
                </label>
                <input
                  id="edit-current-password"
                  type="password"
                  className={styles.editInput}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                {editErrors.currentPassword && <div className={styles.editError}>{editErrors.currentPassword}</div>}
                {editErrors.form && <div className={styles.editError}>{editErrors.form}</div>}

                <div className={styles.editActions}>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}>
                    Annuler
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className={styles.nameRow}>
                  <div className={styles.name}>{displayName}</div>
                  {profile && (
                    <button type="button" className={styles.editToggle} onClick={startEditing}>
                      Modifier
                    </button>
                  )}
                </div>
                {profile && (
                  <>
                    <div className={styles.memberSince}>Membre depuis {profile.memberSince}</div>
                    <div className={styles.email}>{profile.email}</div>
                  </>
                )}
                <div className={styles.objectiveRow}>
                  <span className={styles.objectiveLabel}>Objectif JLPT</span>
                  <div className={styles.chipsRow}>
                    {jlptLevels.map((level) => {
                      const selected = level.id === objectiveLevel
                      const chipStyle = {
                        borderColor: level.color,
                        background: selected ? level.color : 'transparent',
                        color: selected ? '#fff' : level.color,
                      }
                      return profile ? (
                        <div key={level.id} className={styles.chip} style={chipStyle}>
                          {level.id}
                        </div>
                      ) : (
                        <button
                          key={level.id}
                          type="button"
                          className={styles.chip}
                          style={chipStyle}
                          onClick={() => selectGuestObjective(level.id)}
                        >
                          {level.id}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {profile ? (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{profile.gamesPlayed}</div>
                <div className={styles.statLabel}>parties jouées</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{profile.averageScore}%</div>
                <div className={styles.statLabel}>score moyen</div>
              </div>
            </div>

            <div className={styles.sectionLabel}>SCORE MOYEN PAR NIVEAU JLPT</div>
            <div className={styles.levelsList}>
              {profile.perLevel.map((stat) => {
                const level = jlptLevels.find((l) => l.id === stat.level)!
                return (
                  <div key={stat.level} className={styles.levelRow}>
                    <div className={styles.levelId} style={{ color: level.color }}>
                      {stat.level}
                    </div>
                    <div className={styles.levelBarTrack}>
                      <div
                        className={styles.levelBarFill}
                        style={{ width: `${stat.averageScore}%`, background: level.color }}
                      />
                    </div>
                    <div className={styles.levelPercent}>{stat.averageScore}%</div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className={styles.guestNotice}>
            Connecte-toi pour suivre tes statistiques : parties jouées, score moyen et progression par niveau JLPT.
          </div>
        )}
      </div>
    </div>
  )
}
