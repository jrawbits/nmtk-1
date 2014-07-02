#!/usr/bin/env python
# Non-Motorized Toolkit
# Copyright (c) 2014 Open Technology Group Inc. (A North Carolina Corporation)
# Developed under Federal Highway Administration (FHWA) Contracts:
# DTFH61-12-P-00147 and DTFH61-14-P-00108
# 
# Redistribution and use in source and binary forms, with or without modification, 
# are permitted provided that the following conditions are met:
#     * Redistributions of source code must retain the above copyright notice, 
#       this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above copyright 
#       notice, this list of conditions and the following disclaimer 
#       in the documentation and/or other materials provided with the distribution.
#     * Neither the name of the Open Technology Group, the name of the 
#       Federal Highway Administration (FHWA), nor the names of any 
#       other contributors may be used to endorse or promote products 
#       derived from this software without specific prior written permission.
# 
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS 
# FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL 
# Open Technology Group Inc BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF 
# USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
# AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT 
# OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
# Django settings for NMTK_apps project.
import os
import djcelery
import socket

BASE_PATH=os.path.dirname(__file__)
# The path to where any files uploaded to the server are stored.
FILES_PATH=os.path.abspath(os.path.join(BASE_PATH, '..','..','nmtk_files'))

LOGFILE_PATH=os.path.abspath(os.path.join(BASE_PATH, '..','..','logs'))

# Used to initialize the sites model (see: NMTK_server/management/__init__.py)
# This should be overridden by the VHOST name, but it is defaulted to the FQDN
# since in most cases that will be the same.
# It should be noted that if you use any kind of vhost setup, then this
# probably won't work, and will result in all kinds of broken-ness :-) 

SITE_DOMAIN=socket.getfqdn()
DEBUG = True
TEMPLATE_DEBUG = TASTYPIE_FULL_DEBUG = DEBUG
# if production is set to true, then the minified version of the
# code will be loaded instead of the regular version. This means that
# python manage.py minify would have to be run before collectstatic
PRODUCTION=False

djcelery.setup_loader()

ACCOUNT_ACTIVATION_DAYS=3
REGISTRATION_OPEN=True
ADMINS = (
     ('Chander Ganesan', 'chander@otg-nc.com'),
)
MANAGERS = (
            ('Chander Ganesan', 'chander@otg-nc.com'),
            ('Jeremy Raw', 'jeremy.raw@dot.gov'),
            )

EMAIL_SUBJECT_PREFIX='[{0}] '.format(SITE_DOMAIN)

# Indicates that once an account is created, an admin needs to approve it/enable it
# basically results in new accounts being disabled.
ADMIN_APPROVAL_REQUIRED=True

# The path to the MapServer executable
MAPSERV_PATH=os.path.abspath(os.path.join(BASE_PATH, '..', '..', 'cgi-bin','mapserv'))
# The path to where node.js binaries are installed.
NODE_PATH=os.path.abspath(os.path.join(BASE_PATH, '..', '..', 'node','bin'))
# The font used for legend text.
LEGEND_FONT=os.path.abspath(os.path.join(BASE_PATH,'..','..','fonts','Amble-Regular.ttf'))
MAPSERVER_TEMPLATE=os.path.abspath(os.path.join(BASE_PATH, '..','NMTK_server','templates','NMTK_server','mapserver_template.js'))
SERVER_EMAIL=DEFAULT_FROM_EMAIL='nmtk@otg-nc.com'
EMAIL_BACKEND='NMTK_apps.email_backend.EmailBackend'
# If you wish to have django connect to a remote SMTP server, use these
# settings.  The default config assumes you have sendmail (locally) setup 
# properly.  The author has ssmtp (apt-get install ssmtp) setup to do this - 
# which prevents him
# from having to have a password in his checked-in configs.
#EMAIL_USE_TLS = True 
#EMAIL_HOST='smtp.gmail.com'
#EMAIL_PORT = 587
#EMAIL_HOST_PASSWORD = None

MANAGERS = ADMINS
ALLOWED_HOSTS=[SITE_DOMAIN,]
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.spatialite', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': os.path.join(FILES_PATH,'nmtk.sqlite'),  # Or path to database file if using sqlite3.
        'USER': '',                      # Not used with sqlite3.
        'PASSWORD': '',                  # Not used with sqlite3.
        'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT=os.path.abspath(os.path.join('..', 'htdocs/static'))

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'hk(f4*q-%yo9xf*x@_4#cv=wc8zp=%03=sukgl+_6sz2=zdmy='

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'NMTK_server.middleware.strict_authentication.StrictAuthentication',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'NMTK_apps.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'NMTK_apps.wsgi.application'
TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.

    # This directory adds the templates that are stored in the NMTK_apps directory,
    # Which is not an app - but the underpinnings for everything else.
    os.path.join(BASE_PATH,'templates'),
)




TEMPLATE_CONTEXT_PROCESSORS=("django.contrib.auth.context_processors.auth",
                             "django.core.context_processors.debug",
                             "django.core.context_processors.i18n",
                             "django.core.context_processors.media",
                             "django.core.context_processors.static",
                             "django.core.context_processors.tz",
                             "django.contrib.messages.context_processors.messages",
                             "django.core.context_processors.request", 
                              )

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'registration',
    'widget_tweaks',
    # Uncomment the next line to enable the admin:
#    'django_admin_bootstrapped',
    'NMTK_server', # A test NMTK server for NMTK validating tools locally.
    'NMTK_ui', # the UI components for NMTK server
    'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
    'NMTK_tools', # An app used to generate a list of tools.
    'MN_model', # The tool for the Minnesota pedestrian/cycle models
    'SF_model', # The tool for the SF pedestrian model
    'djcelery',
    'kombu.transport.django',
    'tastypie',
)
# The test tool only gets installed if debug is set to true.
if not PRODUCTION:
    INSTALLED_APPS=INSTALLED_APPS + (
                                     'test_tool', # A sample tool designed for testing new stuff.
                                     )


# Define a GeoJSON serializer so we can serialize and return results of
# various tasks in the GeoJSON format.
SERIALIZATION_MODULES = { 'geojson' : 'NMTK_apps.serializers.geojson' }


# The URL Used for logins
LOGIN_URL='/server/login/'

# if you want to change the logging (to disable debug) do it here..
MIN_LOG_LEVEL='DEBUG' # 'INFO' for non-debug, 'DEBUG' for debugging

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
    
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
    },
    'handlers': {
        'null': {
            'level':'DEBUG',
            'class':'django.utils.log.NullHandler',
        },
        'debug': {
            'level':'DEBUG',
            'class':'logging.handlers.WatchedFileHandler',
            'filename': os.path.join(LOGFILE_PATH,'django-debug.log'),
            'formatter':'standard',
        },  
        'default': {
            'level':'INFO',
            'class':'logging.handlers.WatchedFileHandler',
            'filename': os.path.join(LOGFILE_PATH,'django-request.log'),
            'formatter':'standard',
        },
        'apache': {
            'level':'INFO',
            'class':'logging.StreamHandler',
            'formatter':'standard',
        },
    },
    'loggers': {    
        '': {
            'handlers': ['debug', 'default'],
            'level': MIN_LOG_LEVEL,
            'propagate': True,
        },
        'django.request': { # Stop request debug from logging to main logger
            'handlers': ['apache'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db': { # We can turn on db logging by switching the handler to debug
            'handlers': ['null'],
            'level': MIN_LOG_LEVEL,
            'propagate': False,
        },
    }
}

# This dictionary is used by NMTK tools to interact with the NMTK server
# In particular, it stores the public/private keys for each tool server.
#
# Note: by design if you are using the NMTK_server app (which is a 
# client-interface to NMTK tools that provides data management, among other
# things) it won't use this data - it's for tools only.  The Server app will
# use it's database records for managing this.  However, it's important to
# note that what's here, and what's in the DB should match or requests to/from
# the server will fail.

# In the case below, the key is the public key that the server has assigned 
# to this tool.  The url is the URL for the server, and the secret is the
# shared secret key used for signing requests.  Note that the client identifies
# the server using the public key - which is included in any dialog between 
# the client and the server.
NMTK_SERVERS={'d0461b9536eb483d9f23c157e809af35': {'url': 'http://{0}/server'.format(SITE_DOMAIN),
                                                   'secret': '''yq@5u058y312%ebmyi85ytpfwjm9zv)1u2wu-m1s)%cngrvf_^''' },
              '51d315f8f1c545dbb60505722ff85132': {'url': ' http://ec2-23-20-159-89.compute-1.amazonaws.com/demo/',
                                                   'secret': '''1o782+$&*pyed1efg@nii7_9r&72%dxgm_2rm7v0jl((h#=4p0''' },
              }

BROKER_URL = 'django://'


# A list of modules used by the data loader, note that order is important here
# Since the first loader that recognizes a file will process it.
DATA_LOADERS=['NMTK_server.data_loaders.ogr.OGRLoader',
              'NMTK_server.data_loaders.csv.CSVLoader']
