from tests.utils.NMTKTestCase import NMTKTestCase
from tests.utils.client import NMTKClient
import logging
import simplejson as json
import subprocess
import os
logger=logging.getLogger(__name__)

class TestAPIUserManagement(NMTKTestCase):
    def setUp(self):
        super(TestAPIUserManagement, self).setUp()
        self.client=NMTKClient(self.site_url)
        self.client.login(self.username, self.password)
        self.api_user_url=self.client.getURL('api','user/')
        self.delusers=[]
    
    def tearDown(self):
        '''
        Use the management purge_users command to purge the users created
        during testing from the database.
        '''
        if self.delusers:
            command=['python',
                     self.settings_command,
                     'purge_users'] + self.delusers
            with open(os.devnull, "w") as fnull:
                subprocess.call(command, stdout=fnull, stderr=fnull)
        
    def _create_user(self, username, password, **kwargs):
        '''
        A helper method to create a new user, given a password and userid
        '''
        data={'username': username,
              'password': password}
        data.update(kwargs)
        response=self.client.post(self.api_user_url,
                                  data=json.dumps(data),
                                  headers={'Content-Type': 'application/json',})
        logger.debug('Response from create user request was %s', 
                     response.status_code)
        # Status code of 201 means it got created.
        logger.debug('HTTP Result was %s', response.headers.get('location'))
        self.delusers.append(username)
        return response
        
    def _delete_user(self, url):
        response=self.client.delete(url)
        logger.debug('Deleted %s with status code of %s',
                     url, response.status_code)
        return response

    def test_retrieve_users(self):
        '''
        Verify that the API can be used to 
        '''
        payload={'format': 'json' }
        result=self.client.get(self.api_user_url, params=payload)
        response=result.json()
        # Verify that at least 1 record was returned
        self.assertGreaterEqual(response['meta']['total_count'], 1)
        # Verify that the object count matches the metadata
        self.assertEqual(len(response['objects']), 
                         response['meta']['total_count'])
                             
    def test_create_delete_user(self):
        '''
        Verify that we can create a user via the API, and delete a user via the API
        In this case we will also validate that users, once deleted, are 
        effectively neutered via the UI.  The same is true for a logged in user
        whose account is deleted while the user is logged in.
        '''
        payload={'format': 'json' }
        response=self.client.get(self.api_user_url, params=payload)
        user_count=response.json()['meta']['total_count']
        # Create the user
        username='test_user'
        password='test_password123'
        response=self._create_user(username, password)
        self.assertEqual(201, response.status_code,
                         'Expected status code of 201, not %s' % 
                         (response.status_code))
        user_uri=response.headers['location']
        
        # Get a list of users, verifying that user is there
        response=self.client.get(self.api_user_url, params=payload)
        json_data=response.json()
        # Verify we have one more user than before
        self.assertEqual(user_count+1, json_data['meta']['total_count'],
                         'Final count of users is %s, expected %s' % 
                         (json_data['meta']['total_count'],
                          user_count+1))
        
        # Verify that the user we created exists
        usernames=[rec['username'] for rec in json_data['objects']]
        self.assertTrue(username in usernames, 
                        'Username %s not found in %s' % 
                        (username, ','.join(usernames)))
        
        # Verify we can get the user via a query
        payload2=payload.copy()
        payload2['username']= username
        response=self.client.get(self.api_user_url, params=payload2)
        json_data=response.json()
        logger.debug('Response was %s', response.text)
        self.assertEqual(1, json_data['meta']['total_count'],
                         'Retrieve record for ONLY %s, got %s records back' % 
                         (username,
                          json_data['meta']['total_count']))
        
        # Verify that the user we created exists (just copy the check from above,
        # because I am lazy - and this works the same)
        usernames=[rec['username'] for rec in json_data['objects']]
        self.assertTrue(username in usernames, 
                        'Username %s not found in %s' % 
                        (username, ','.join(usernames)))
        
        # MAke sure that meta wasn't lying, and we really only got one record back.
        self.assertEqual(len(usernames),1,msg='More than one user returned from query')
        
        # Verify we can login as the newly created user.
        client=NMTKClient(self.site_url)
        response=client.login(username, password)
        logger.debug('Response from login was %s', response.status_code)
        self.assertEqual(response.status_code,302,
                         'Login did not produce expected redirect')
        self.assertTrue(len(response.headers.get('location')),
                        'Redirect location header expected, not provided')
        response=client.get(client.getURL(path=''),
                            allow_redirects=False)
        self.assertEqual(200, response.status_code,
                         'Unexpected redirect retrieving protected URI')
                
        # Delete the user we just created
        response=self._delete_user(user_uri)
        self.assertEqual(204, response.status_code)
        
        # Try to access a protected URL
        response=client.get(client.getURL(path=''),
                            allow_redirects=False)
        self.assertEqual(302, response.status_code,
                         'Deleted user should not be able to access a' +
                         ' protected URI')
        
        # Try to login again as the disabled user:
        client=NMTKClient(self.site_url)
        response=client.login(username, password)
        self.assertEqual(200, response.status_code,
                         'Login for deleted user should fail')
        
        response=client.get(client.getURL(path=''),
                            allow_redirects=False)
        self.assertEqual(302, response.status_code,
                         'Deleted user should not be able to access a' +
                         ' protected URI')
        
    def test_user_change_password(self):
        '''
        Verify that password change functionality functions as designed.
        '''
        payload={'format': 'json' }
        response=self.client.get(self.api_user_url, params=payload)
        
        # Create the user
        username='test_user'
        password='test_password123'
        response=self._create_user(username, password)
        user_url=response.headers['location']
        # Create the user
        username2='test_user2'
        password2='test_password1234'
        response=self._create_user(username2, password2)
        user2_url=response.headers['location']
        
        client=NMTKClient(self.site_url)
        response=client.login(username, password)
        
        client2=NMTKClient(self.site_url)
        response=client2.login(username2, password2)
        
        client_data=client.get(user_url).json()
        client2_data=client2.get(user2_url).json()
        
        # user changes his own password
        client_data['password']='%s_1' % (password,)
        client.put(user_url, data=json.dumps(client_data))
        
        # login with new password
        client_a=NMTKClient(self.site_url)
        response=client_a.login(username, client_data['password'])
        self.assertEqual(response.status_code, 302,
                         'Redirect expected after successful login')
        
        # Verify old password no longer works
        response=client_a.login(username, password)
        self.assertEqual(response.status_code, 200,
                         'Redirect not expected after login ' + 
                         'attempt with old password')
        
        # User tries to change another users password
        client2_data['password']=password
        response=client.put(user2_url, data=json.dumps(client2_data))
        self.assertEqual(401, response.status_code,
                         'Expected to get a 401 (Unauthorized) when a ' +
                         'non-superuser tries to change another users password')
        
        # Verify old password still works
        response=client_a.login(username2, password2)
        self.assertEqual(response.status_code, 302,
                         'Redirect expected after login ' + 
                         'attempt with original password')
        
        # Superuser tries to change user password.
        response=self.client.put(user2_url, data=json.dumps(client2_data))
        self.assertEqual(204, response.status_code,
                         'Expected to get a 204 when a ' +
                         'superuser tries to change another users password')
        
        # Verify password change worked
        client2_a=NMTKClient(self.site_url)
        response=client2_a.login(username2, password)
        self.assertEqual(response.status_code, 302,
                         'Redirect expected after successful login')
        
        # Verify old password no longer works
        response=client2_a.login(username2, password2)
        self.assertEqual(response.status_code, 200,
                         'Redirect not expected after login ' + 
                         'attempt with old password')

        
        
        
    def test_verify_nonprivileged_user_cannot_change_other_fields(self):
        '''
        Verify that a non-privileged user cannot change their account aside from the password.
        '''
        payload={'format': 'json' }
        response=self.client.get(self.api_user_url, params=payload)
        
        # Create the user
        username='test_user'
        password='test_password123'
        response=self._create_user(username, password)
        user_uri=response.headers['location']
        
        # Get a login session
        client=NMTKClient(self.site_url)
        response=client.login(username, password)
        
        user_data=client.get(user_uri).json()
        user_data['username']='test_new_username'
        # Just in case
        self.delusers.append('test_new_username')
        response=client.put(user_uri, data=json.dumps(user_data))
        logger.debug(response.text)
        self.assertEqual(response.status_code, 401,
                         'Response to change username should be 400, not %s' %
                         (response.status_code,))
    
    def test_verify_nonprivileged_user_cannot_create_users(self):
        '''
        Verify that a non-privileged user cannot create user accounts
        '''
        payload={'format': 'json' }
        response=self.client.get(self.api_user_url, params=payload)
        
        # Create the user
        username='test_user1'
        password='test_password123'
        response=self._create_user(username, password)
        self.assertEqual(201, response.status_code,
                         'Expected status code of 201, not %s' % 
                         (response.status_code))
        user_uri=response.headers['location']
        
        # Try to create a user
        client=NMTKClient(self.site_url)
        response=client.login(username, password)
        
        data={'username': '%s1' % username,
              'password': password}
        
        response=client.post(self.api_user_url,
                              data=json.dumps(data),
                              headers={'Content-Type': 'application/json',})
        logger.debug('Response from create user request was %s', 
                     response.status_code)
        self.assertEqual(401, response.status_code)
        
        response=self.client.get(self.api_user_url, params=payload)
        for v in response.json()['objects']:
            self.assertFalse(v['username'] == data['username'],
                             'User %s was created, but should not have been' %
                             data['username']) 
        
        
        
        