const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} = require('firebase/firestore');

async function main() {
  const env = await initializeTestEnvironment({
    projectId: 'demo-family-calendar-test',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8')
    }
  });

  let passed = 0;
  let failed = 0;

  async function test(name, operation) {
    try {
      await operation();
      console.log('PASS: ' + name);
      passed++;
    } catch (error) {
      console.error('FAIL: ' + name);
      console.error(error.message);
      failed++;
    }
  }

  try {
    await env.clearFirestore();

    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();

      await setDoc(doc(db, 'users/alice'), {
        name: 'Alice',
        friendCode: '123456',
        friends: []
      });

      await setDoc(doc(db, 'users/bob'), {
        name: 'Bob',
        friendCode: '234567',
        friends: []
      });

      await setDoc(doc(db, 'users/carol'), {
        name: 'Carol',
        friendCode: '345678',
        friends: []
      });

      await setDoc(doc(db, 'friendInvites/test-invite-token-1234567890abcdef'), {
        senderId: 'alice',
        senderName: 'Alice',
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 86400000)
      });

      await setDoc(doc(db, 'friendCodes/123456'), { uid: 'alice', name: 'Alice' });
      await setDoc(doc(db, 'friendCodes/234567'), { uid: 'bob', name: 'Bob' });

      await setDoc(doc(db, 'friendships/alice__bob'), {
        requesterId: 'alice',
        addresseeId: 'bob',
        status: 'accepted'
      });

      await setDoc(doc(db, 'friendships/bob__carol'), {
        requesterId: 'bob',
        addresseeId: 'carol',
        requesterName: 'Bob',
        createdAt: 1000,
        status: 'pending'
      });
      await setDoc(doc(db, 'users/eventAlice'), {
        name: 'Event Alice',
        friends: ['eventBob']
      });

      await setDoc(doc(db, 'users/eventBob'), {
        name: 'Event Bob',
        friends: ['eventAlice']
      });

      await setDoc(doc(db, 'users/eventCarol'), {
        name: 'Event Carol',
        friends: []
      });

      await setDoc(doc(db, 'friendships/eventAlice__eventBob'), {
        requesterId: 'eventAlice',
        addresseeId: 'eventBob',
        status: 'accepted'
      });

      await setDoc(doc(db, 'friendships/eventBob__eventCarol'), {
        requesterId: 'eventBob',
        addresseeId: 'eventCarol',
        status: 'pending'
      });
      await setDoc(doc(db, 'users/eventAliceNoFriends'), {
        name: 'Event Alice without mirrored friends array',
        friends: []
      });
      await setDoc(doc(db, 'friendships/eventAliceNoFriends__eventBob'), {
        requesterId: 'eventAliceNoFriends',
        addresseeId: 'eventBob',
        status: 'accepted'
      });
      await setDoc(doc(db, 'events/eventAliceNoFriends-legacy-selected'), {
        authorId: 'eventAliceNoFriends',
        visibility: 'selected',
        visibleTo: ['eventBob']
      });
      await setDoc(doc(db, 'events/eventAlice-update-valid'), {
        authorId: 'eventAlice',
        visibility: 'none',
        visibleTo: []
      });

      await setDoc(doc(db, 'events/eventAlice-update-invalid'), {
        authorId: 'eventAlice',
        visibility: 'none',
        visibleTo: []
      });

      await setDoc(doc(db, 'events/private'), {
        authorId: 'alice',
        visibility: 'none',
        visibleTo: []
      });

      await setDoc(doc(db, 'events/all'), {
        authorId: 'alice',
        visibility: 'all',
        visibleTo: []
      });

      await setDoc(doc(db, 'events/selected-bob'), {
        authorId: 'alice',
        visibility: 'selected',
        visibleTo: ['bob'],
        visibleToMap: { bob: true }
      });

      await setDoc(doc(db, 'events/selected-carol'), {
        authorId: 'alice',
        visibility: 'selected',
        visibleTo: ['carol'],
        visibleToMap: { carol: true }
      });

      // Amicizia legacy con ID casuale: il profilo conserva il riferimento
      // all'ultima amicizia accettata, ma non ha ancora l'array friends.
      await setDoc(doc(db, 'users/legacyAuthor'), {
        name: 'Legacy Author',
        friends: [],
        lastAcceptedFriendshipId: 'legacy-friendship-random-id'
      });
      await setDoc(doc(db, 'users/legacyViewer'), {
        name: 'Legacy Viewer',
        friends: []
      });
      await setDoc(doc(db, 'friendships/legacy-friendship-random-id'), {
        requesterId: 'legacyAuthor',
        addresseeId: 'legacyViewer',
        status: 'accepted'
      });
      await setDoc(doc(db, 'events/legacy-selected'), {
        authorId: 'legacyAuthor',
        visibility: 'selected',
        visibleTo: ['legacyViewer'],
        visibleToMap: { legacyViewer: true }
      });
    });

    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    const carol = env.authenticatedContext('carol').firestore();
    const stranger = env.authenticatedContext('stranger').firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    const eventAlice = env.authenticatedContext('eventAlice').firestore();
    const eventAliceNoFriends = env.authenticatedContext('eventAliceNoFriends').firestore();
    const eventBob = env.authenticatedContext('eventBob').firestore();
    const legacyViewer = env.authenticatedContext('legacyViewer').firestore();

    await test('Un utente legge il proprio profilo', () =>
      assertSucceeds(getDoc(doc(alice, 'users/alice'))));

    await test('Un estraneo non legge il profilo altrui', () =>
      assertFails(getDoc(doc(stranger, 'users/alice'))));

    await test('Non ÃƒÆ’Ã‚Â¨ possibile elencare tutti i profili', () =>
      assertFails(getDocs(collection(bob, 'users'))));

    await test('Un utente autenticato puÃƒÆ’Ã‚Â² cercare un codice amico esatto', () =>
      assertSucceeds(getDoc(doc(bob, 'friendCodes/123456'))));

    await test('Non ÃƒÆ’Ã‚Â¨ possibile elencare tutti i codici amico', () =>
      assertFails(getDocs(collection(bob, 'friendCodes'))));

    await test('Un utente non autenticato non legge i codici', () =>
      assertFails(getDoc(doc(anonymous, 'friendCodes/123456'))));

    await test('Il proprietario legge il proprio evento privato', () =>
      assertSucceeds(getDoc(doc(alice, 'events/private'))));

    await test('Un estraneo non legge un evento privato', () =>
      assertFails(getDoc(doc(stranger, 'events/private'))));

    await test('Un amico accettato legge un evento condiviso con tutti', () =>
      assertSucceeds(getDoc(doc(bob, 'events/all'))));

    await test('Un amico legge un evento selezionato per lui', () =>
      assertSucceeds(getDoc(doc(bob, 'events/selected-bob'))));

    await test('Il proprietario può completare la migrazione visibleToMap anche se il profilo friends non è sincronizzato', () =>
      assertSucceeds(updateDoc(doc(eventAliceNoFriends, 'events/eventAliceNoFriends-legacy-selected'), {
        visibleToMap: { eventBob: true }
      })));

    await test('Un amico legge eventi condivisi all tramite query', () =>
      assertSucceeds(getDocs(query(
        collection(bob, 'events'),
        where('authorId', '==', 'alice'),
        where('visibility', '==', 'all')
      ))));

    await test('Un amico legge eventi selected tramite query con array-contains', () =>
      assertSucceeds(getDocs(query(
        collection(bob, 'events'),
        where('authorId', '==', 'alice'),
        where('visibility', '==', 'selected'),
        where('visibleToMap.bob', '==', true)
      ))));

    await test('Un amico legacy legge un evento selected tramite ID amicizia non deterministico', () =>
      assertSucceeds(getDoc(doc(legacyViewer, 'events/legacy-selected'))));

    await test('Un amico legacy legge eventi selected tramite query', () =>
      assertSucceeds(getDocs(query(
        collection(legacyViewer, 'events'),
        where('authorId', '==', 'legacyAuthor'),
        where('visibility', '==', 'selected'),
        where('visibleToMap.legacyViewer', '==', true)
      ))));

    await test('Un amico non legge un evento non condiviso con lui', () =>
      assertFails(getDoc(doc(bob, 'events/private'))));

    await test('Un estraneo non legge un evento selezionato per altri', () =>
      assertFails(getDoc(doc(carol, 'events/selected-carol'))));


    await test('Un amico accettato puÃƒÆ’Ã‚Â² aggiungere se stesso al profilo del richiedente', () =>
      assertSucceeds(updateDoc(doc(bob, 'users/alice'), {
        friends: ['bob'],
        lastAcceptedFriendshipId: 'alice__bob'
      })));

    await test('Un amico non puÃƒÆ’Ã‚Â² aggiungere terze persone al profilo del richiedente', () =>
      assertFails(updateDoc(doc(bob, 'users/alice'), {
        friends: ['bob', 'carol'],
        lastAcceptedFriendshipId: 'alice__bob'
      })));
    await test("Un invito può essere accettato creando direttamente un'amicizia", async () => {
      const batch = writeBatch(bob);
      batch.update(doc(bob, 'friendInvites/test-invite-token-1234567890abcdef'), {
        status: 'accepted',
        recipientId: 'bob',
        acceptedAt: Date.now()
      });
      batch.set(doc(bob, 'friendships/invite_test-invite-token-1234567890abcdef'), {
        requesterId: 'alice',
        addresseeId: 'bob',
        requesterName: 'Alice',
        status: 'accepted',
        createdAt: Date.now(),
        inviteId: 'test-invite-token-1234567890abcdef'
      });
      await assertSucceeds(batch.commit());

    });

    await test('Un utente non può accettare un invito a nome di un altro', () =>
      assertFails(updateDoc(doc(stranger, 'friendInvites/test-invite-token-1234567890abcdef'), {
        status: 'accepted',
        recipientId: 'carol',
        acceptedAt: Date.now()
      })));

    await test('Un utente può inviare una richiesta di amicizia', () =>
      assertSucceeds(setDoc(doc(alice, 'friendships/alice__carol'), {
        requesterId: 'alice',
        addresseeId: 'carol',
        requesterName: 'Alice',
        createdAt: 2000,
        status: 'pending'
      })));

    await test('Un utente non può inviare una richiesta a nome di un altro', () =>
      assertFails(setDoc(doc(stranger, 'friendships/bob__alice'), {
        requesterId: 'bob',
        addresseeId: 'alice',
        requesterName: 'Bob',
        createdAt: 2001,
        status: 'pending'
      })));

    await test('Solo il destinatario può accettare una richiesta', () =>
      assertFails(updateDoc(doc(bob, 'friendships/alice__carol'), {
        status: 'accepted'
      })));

    await test('Il destinatario può accettare la richiesta aggiornando il proprio profilo', async () => {
      const batch = writeBatch(carol);
      batch.update(doc(carol, 'friendships/alice__carol'), { status: 'accepted' });
      batch.update(doc(carol, 'users/alice'), {
        friends: ['bob', 'carol'],
        lastAcceptedFriendshipId: 'alice__carol'
      });
      await assertSucceeds(batch.commit());
    });

    await test('Il destinatario può rifiutare una richiesta', () =>
      assertSucceeds(updateDoc(doc(carol, 'friendships/bob__carol'), {
        status: 'declined'
      })));

    await test('Dopo il rifiuto, il mittente può inviare nuovamente la richiesta', () =>
      assertSucceeds(updateDoc(doc(bob, 'friendships/bob__carol'), {
        status: 'pending',
        createdAt: 3000,
        requesterName: 'Bob'
      })));

    await test('Un utente terzo non può rifiutare una richiesta', () =>
      assertFails(updateDoc(doc(stranger, 'friendships/bob__carol'), {
        status: 'declined'
      })));
    await test('Un utente non può inviare una richiesta a se stesso', () =>
      assertFails(setDoc(doc(alice, 'friendships/alice__alice'), {
        requesterId: 'alice',
        addresseeId: 'alice',
        requesterName: 'Alice',
        createdAt: 4000,
        status: 'pending'
      })));

    await test('Il mittente non può modificare il destinatario della richiesta', () =>
      assertFails(updateDoc(doc(bob, 'friendships/bob__carol'), {
        addresseeId: 'alice'
      })));

    await test('Una richiesta accettata non può essere rifiutata', () =>
      assertFails(updateDoc(doc(bob, 'friendships/alice__bob'), {
        status: 'declined'
      })));

    await test('Un utente non coinvolto non può accettare una richiesta', () =>
      assertFails(updateDoc(doc(alice, 'friendships/bob__carol'), {
        status: 'accepted'
      })));

    await test('Una richiesta accettata non può tornare in pending', () =>
      assertFails(updateDoc(doc(alice, 'friendships/alice__bob'), {
        status: 'pending'
      })));
    await test('Un nuovo utente puÃƒÆ’Ã‚Â² creare profilo e codice amico insieme', async () => {
      const dave = env.authenticatedContext('dave').firestore();
      const batch = writeBatch(dave);

      batch.set(doc(dave, 'users/dave'), {
        name: 'Dave',
        friendCode: '456789',
        friends: []
      });

      batch.set(doc(dave, 'friendCodes/456789'), {
        uid: 'dave'
      });

      await assertSucceeds(batch.commit());
    });

    await test('Un utente non puÃƒÆ’Ã‚Â² creare un profilo a nome di un altro', async () => {
      const attacker = env.authenticatedContext('attacker').firestore();
      const batch = writeBatch(attacker);

      batch.set(doc(attacker, 'users/victim'), {
        name: 'Victim',
        friendCode: '567890',
        friends: []
      });

      batch.set(doc(attacker, 'friendCodes/567890'), {
        uid: 'victim'
      });

      await assertFails(batch.commit());
    });

    await test('Non si puÃƒÆ’Ã‚Â² registrare un codice amico giÃƒÆ’Ã‚Â  utilizzato', async () => {
      const eve = env.authenticatedContext('eve').firestore();
      const batch = writeBatch(eve);

      batch.set(doc(eve, 'users/eve'), {
        name: 'Eve',
        friendCode: '123456',
        friends: []
      });

      batch.set(doc(eve, 'friendCodes/123456'), {
        uid: 'eve'
      });

      await assertFails(batch.commit());
    });

    await test('Un altro utente non puÃƒÆ’Ã‚Â² modificare il codice amico di Alice', () =>
      assertFails(updateDoc(doc(bob, 'users/alice'), {
        friendCode: '654321'
      })));
    await test('Un utente non puÃƒÆ’Ã‚Â² creare eventi a nome di altri', () =>
      assertFails(setDoc(doc(bob, 'events/fake'), {
        authorId: 'alice',
        visibility: 'all',
        visibleTo: []
      })));

    await test('Un utente non puÃƒÆ’Ã‚Â² cancellare eventi altrui', () =>
      assertFails(deleteDoc(doc(bob, 'events/all'))));

    await test('Un amico non puo modificare eventi di Alice', () =>
      assertFails(updateDoc(doc(bob, 'events/all'), {
        visibility: 'none'
      })));

    await test('Alice non puo cambiare il proprietario del proprio evento', () =>
      assertFails(updateDoc(doc(alice, 'events/private'), {
        authorId: 'bob'
      })));

    await test('Un amico non puo modificare un evento privato altrui', () =>
      assertFails(updateDoc(doc(bob, 'events/private'), {
        visibility: 'all'
      })));

    await test('Alice puo modificare un proprio evento', () =>
      assertSucceeds(updateDoc(doc(alice, 'events/private'), {
        visibility: 'selected',
        visibleTo: ['bob'],
        visibleToMap: { bob: true }
      })));

    await test('Alice puo cancellare un proprio evento', () =>
      assertSucceeds(deleteDoc(doc(alice, 'events/selected-carol'))));
    await test('Un utente puo condividere un evento con un amico accettato', () =>
      assertSucceeds(setDoc(doc(alice, 'events/share-accepted'), {
        authorId: 'alice',
        visibility: 'selected',
        visibleTo: ['bob'],
        visibleToMap: { bob: true }
      })));

    await test('Non si puo condividere con un utente con richiesta pending', () =>
      assertFails(setDoc(doc(bob, 'events/share-pending'), {
        authorId: 'bob',
        visibility: 'selected',
        visibleTo: ['carol'],
        visibleToMap: { carol: true }
      })));

    await test('Non si puo condividere con un utente senza amicizia', () =>
      assertFails(setDoc(doc(eventAlice, 'events/share-stranger-original'), {
        authorId: 'eventAlice',
        visibility: 'selected',
        visibleTo: ['eventCarol'],
        visibleToMap: { eventCarol: true }
      })));
    await test('Creazione: condivisione con amico accettato consentita', () =>
      assertSucceeds(setDoc(doc(eventAlice, 'events/eventAlice-share-accepted'), {
        authorId: 'eventAlice',
        visibility: 'selected',
        visibleTo: ['eventBob'],
        visibleToMap: { eventBob: true }
      })));

    await test('Creazione: condivisione con amicizia pending vietata', () =>
      assertFails(setDoc(doc(eventBob, 'events/share-pending'), {
        authorId: 'eventBob',
        visibility: 'selected',
        visibleTo: ['eventCarol'],
        visibleToMap: { eventCarol: true }
      })));

    await test('Creazione: condivisione senza amicizia vietata', () =>
      assertFails(setDoc(doc(eventAlice, 'events/share-stranger'), {
        authorId: 'eventAlice',
        visibility: 'selected',
        visibleTo: ['eventCarol'],
        visibleToMap: { eventCarol: true }
      })));

    await test('Modifica: condivisione con amico accettato consentita', () =>
      assertSucceeds(updateDoc(doc(eventAlice, 'events/eventAlice-update-valid'), {
        visibility: 'selected',
        visibleTo: ['eventBob'],
        visibleToMap: { eventBob: true }
      })));

    await test('Modifica: condivisione con utente non amico vietata', () =>
      assertFails(updateDoc(doc(eventAlice, 'events/eventAlice-update-invalid'), {
        visibility: 'selected',
        visibleTo: ['eventCarol'],
        visibleToMap: { eventCarol: true }
      })));
  } finally {
    await env.cleanup();
  }

  console.log('\nRisultato: ' + passed + ' superati, ' + failed + ' falliti.');
  if (failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});




