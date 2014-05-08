# Important to get the right load order for devise overwrites.
# engine -> main_app -> all (everyting else)
require 'devise'

require 'haml'
require 'coffee-rails'
require 'sass/rails'
require 'bootstrap-sass'
require 'font-awesome-rails'
require 'animate-scss'

require 'simple_form'
require 'country_select'
require 'hive/simple_form'

require 'hive/routes'

module Hive
  autoload :Controller, 'hive/controller'
  autoload :SessionsController, 'hive/sessions_controller'
  autoload :DeviseController, 'hive/devise_controller'
  autoload :Helpers, 'hive/helpers'
  autoload :ParameterSanitizer, 'hive/parameter_sanitizer'
  autoload :Models, 'hive/models'
  autoload :Model, 'hive/model'

  # Called by hive initializer in host app.
  # We have a devise initializer in this gem that will setup all important
  # defaults and users can overwrite application specific configurations
  # via the hive initializer in the host app.
  def self.setup
    yield self
  end

  # The name of the app that uses Hive. This is used in the views as a Headline.
  mattr_accessor :app_name
  @@app_name = 'Hive'

  # If true this will use animations in the Hive views.
  mattr_accessor :animate_views
  @@animate_views = true

  # Allows to configure redirect locations for different events. Check the Hive
  # initializer for documentation.
  mattr_accessor :redirect_locations
  @@redirect_locations = { }

  # By default the registration dialog has a password and a password confirmation
  # field to make sure users don't have typos in their passwords. If you want
  # a registration form with less fields you can set this to *true* with the risk
  # of having users with typos in their password who will need to use password
  # recovery later.
  mattr_accessor :registration_requires_password_confirmation
  @@registration_requires_password_confirmation = true

  # Specify if users must confirm their registrations by clicking a link
  # we send to the mailaddress they used for registration.
  # Check the Devise initializer for configration options on the confirmable module.
  mattr_accessor :must_confirm_registration
  @@must_confirm_registration = false

  # Specify if the user must click a checkbox "I have read and agree to the terms of use"
  # when signing up. To translate the checkbox label add/change the key
  # "activerecord.attributes.user.accept_terms" in your locale file.
  mattr_accessor :must_accept_terms_on_sign_up
  @@must_accept_terms_on_sign_up = false

  # Specify after how many failed login attempts a user account should get locked.
  # Check the Devise initializer for configration options on the lockable module.
  mattr_reader :lock_account_after_failed_logins
  @@lock_account_after_failed_logins = false

  def self.lock_account_after_failed_logins=(attempts)
    @@lock_account_after_failed_logins = attempts
    Devise.maximum_attempts = attempts if attempts && attempts > 0
  end

  # Specify if a user can delete his account.
  mattr_accessor :deletable
  @@deletable = true

  # Specify if a user is required to give his current password
  # when deleting his account.
  mattr_accessor :delete_requires_password
  @@delete_requires_password = true

  # Define the layout to use with all Hive views.
  # Can be a string to define one layout for all views or it can be a hash that
  # defines individual layouts for individual controllers and actions.
  mattr_accessor :layout
  @@layout = 'application'

  private
    # Send every method missing to devise to make the setup method work.
    def self.method_missing(method_id, *arguments, &block)
      Devise.send(method_id, *arguments, &block)
    end
end

require 'hive/engine'
