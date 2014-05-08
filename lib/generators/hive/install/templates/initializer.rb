# Use this initializer to configure Hive and Devise.
# All available Hive options are in this file. If you need to change Devise
# options please check TODO: Link to Devise initializer in the Gem on Github!

Hive.setup do |config|
  # Configure the name of your app.
  config.app_name = '<%= Rails.application.class.parent_name.to_s %>'

  # If true this will use animations in the Hive views.
  config.animate_views = true

  # Allows to configure redirect locations for different events. Can be a string
  # or a proc. The following events can be configured:
  #   * :after_sign_up
  #   * :after_inactive_sign_up
  #   * :after_sign_in
  #   * :after_sign_out
  #   * :after_update
  #   * :after_resetting_password
  #   * :after_sending_reset_password_instructions
  #   * :after_resending_confirmation_instructions
  #   * :after_confirmation
  # config.redirect_locations = { after_sign_in: proc { edit_user_registration_path }, after_sign_out: '/' }

  # The secret key used by Devise. Devise uses this key to generate
  # random tokens. Changing this key will render invalid all existing
  # confirmation, reset password and unlock tokens in the database.
  config.secret_key = '<%= SecureRandom.hex(64) %>'

  # ==> Mailer Configuration
  # Configure the e-mail address which will be shown in Devise::Mailer,
  # note that it will be overwritten if you use your own mailer class
  # with default "from" parameter.
  config.mailer_sender = 'please-change-me-at-config-initializers-hive@example.com'

  # ==> Login
  # Configure which key to use when authenticating a user. The default is <tt>:login</tt>
  # which allows the user to login by entering either username or email.
  # You can configure it to use just <tt>:username</tt> or <tt>:email</tt> instead.
  config.authentication_keys = [ :login ]

  # ==> Social logins
  # Configure the social logins by adding app ids and secrets for the providers
  # your users might use to login and/or register.

  # https://dev.twitter.com/apps
  # config.omniauth :twitter, 'APP_ID', 'APP_SECRET'

  # https://developers.facebook.com/apps
  # config.omniauth :facebook, 'APP_ID', 'APP_SECRET'

  # https://cloud.google.com/console
  # config.omniauth :google_oauth2, 'APP_ID', 'APP_SECRET'

  # https://github.com/settings/applications
  # config.omniauth :github, 'APP_ID', 'APP_SECRET', scope: 'user:email'

  # ==> Extra attributes
  # Configure extra attributes you want for your Hive user model.
  # Remember to create a migration when you add or remove something here.
  # Check the README on how to do that.
  config.attributables = [ :username, :company, :first_name, :last_name, :address1, :address2, :zip, :city, :state, :country ]

  # Configure which attributes a user should be allowed to update without specifying
  # her current password. For example you might to allow updates on the address but
  # if the user wants to change email or payment details you ask for the current password again.
  # config.attributables_updateable_without_password = [ :company, :first_name, :last_name, :address1, :address2, :zip, :city, :state, :country ]

  # ==> Avatars
  # Configure the users avatars here. Don't forget to create a migration if you
  # change anything here. Check the README on how it works exactly.
  config.avatar :avatar

  # Configure the storage location. Defaults to :file that will save uploaded
  # files to the local file sytem under [app_root]/public/uploads.
  # You can canfigure it to use Amazon S3, Rackspace, Google Storage or
  # other by supplying a configuration hash. Please check the readme for available options.
  # config.avatar_storage = {
  #   fog_credentials: {
  #     provider: 'AWS',
  #     aws_access_key_id: 'your_aws_access_key_id',
  #     aws_secret_access_key: 'your_aws_secret_access_key'
  #   },
  #   fog_directory: 'name_of_your_bucket'
  # }

  # ==> Registration
  # Configure if users must confirm their accounts to be able to login after
  # registration by clicking a link in a confirmation email we send after registration.
  # If this is +false+ no confirmation is required to login after registration.
  # Check the README for more account confirmation configuration options.
  config.must_confirm_registration = false

  # Configure if users must confirm their passwords on registrations to prevent typos.
  config.registration_requires_password_confirmation = false

  # Configure if users must tick a checkbox to confirm that the have read and
  # agree to the terms of use.
  # config.must_accept_terms_on_sign_up = true

  # ==> Login
  # config.lock_account_after_failed_logins = 3

  # ==> Account deletion
  config.deletable = true

  # Configure if users must confirm account deletion with their current password.
  config.delete_requires_password = true

  # ==> Layout
  # Hive uses your main application layout file to render its views.
  # To use a custom layout for all Hive views use
  # config.layout = 'hive_custom_layout' # This will load the file +app/views/layouts/hive_custom_layout.html+
  # To set a layout for individual Hive controllers and actions use
  # config.layout = { 'default' => 'application', 'sessions' => { 'new' => 'hive_login' }, 'registrations' => { 'new' => 'hive_register' } }
end
