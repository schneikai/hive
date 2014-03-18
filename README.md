# Hive

TODO: Add Screenshot(s) (when sign-in status is fixed and we have background images)!

Hive is a instant user authentication and authorization solution based on
[Devise](http://github.com/plataformatec/devise). It comes with a nice layout,
social logins via Facebook, Twitter an Co., a username, address and avatar.
You can assign roles to your users like moderator or admin and define what
they are allowed to do in your App.

Hive works with Rails 4, Devise 3 and uses Twitter Bootstrap 3 for the layout.


## Installation

Add Hive to your Gemfile and run the bundle command to install it:

```ruby
gem 'hive'
```

After the gem is installed you need to run the install generator:

```console
rails generate hive:install
```

This will generate migrations, the user and user ability model, setup routes,
include the required javascript and stylesheets in your application, copy
translations files to <tt>config/locales</tt> and create the Hive initializer in
<tt>config/initializers/hive.rb</tt>. The initializer is where you configure Hive.
You should check it out.


For now this must be added to the Gemfile of the Rails App that uses Hive:

```ruby
gem 'twitter_bootstrap_form_for', github: 'schneikai/twitter_bootstrap_form_for'
gem 'devise_avatarable', github: 'schneikai/devise_avatarable'
gem 'devise_authorizable', github: 'schneikai/devise_authorizable'
gem 'devise_easy_omniauthable', github: 'schneikai/devise_easy_omniauthable'
gem 'devise_attributable', github: 'schneikai/devise_attributable'
```


## Let's start

To get started add the <tt>sign_in_status</tt> partial to
the body of your application layout file like this:

```ruby
<%= render 'hive/shared/sign_in_status' %>
```

When you open your App you should see login and register links. Try it out.


Here's a little tour of the most important pages in Hive:


### Register/Sign-up

  * Link to - <tt>link_to 'Register', new_user_registration_path</tt>
  * URL example - http://localhost:3000/account/sign_up
  * View template - <tt>app/views/hive/registrations/new.html.haml</tt>

This is where your users register for an account to your Website.

Check out the following configuration settings in the Hive initializer:

* <tt>registration_requires_password_confirmation</tt> - Defaults to *false* and shows
only one field for password on registration. If you set this to *true* the user must
confirm his password to prevent typos.

* <tt>must_confirm_registration</tt> - Defaults to *false* and users are logged in
after registration. If you set this to *false* users need to confirm their accounts
by clicking a link in a email we send after registration.
TODO: Write about Devise ":confirmable" config options.

* <tt>must_accept_terms_on_sign_up</tt> - Defaults to *false*. If your site requires
the users to accepts some form of terms of use you can set this to true and the
user must tick a checkbox in the registration form.


There is more

* If you need to add defaults for new users add a class method
<tt>registration_defaults</tt> to your users model:

  ```ruby
  def self.registration_defaults
    {
      locale: I18n.locale
    }
  end
```

* If you want your users to give more user data like a adress or phone number or
ask them if the want your newsletter checkout "Add more attributes to your user model"
in this README.

* Your users can also login/register via social logins like Facebook or Twitter.
Read more about it under "Configure social logins" in this README.


### Account activation/confirmation

  * Link to - <tt>link_to 'Resend confirmation instructions', new_user_confirmation_path </tt>
  * URL example - http://localhost:3000/account/confirmation/new
  * View template - <tt>app/views/hive/confirmations/new.html.haml</tt>

If <tt>must_confirm_registration</tt> is set to *true* in the Hive initializer
users need to confirm their accounts by clicking a link in a email we send after
registration. If they didn't got the email the can request another one by going to
that page (a link is on the login page of course).


### Login/Sign-in

  * Link to - <tt>link_to 'Login', new_user_session_path</tt>
  * URL example - http://localhost:3000/account/login
  * View template - <tt>app/views/hive/sessions/new.html.haml</tt>
  * Mail template for activation - TODO

This is where your users login to your Website. By default users login via username
or email address and password. You can configure that via <tt>authentication_keys</tt>
in the Hive initializer.

Your users can also login/register via social logins like Facebook or Twitter.
Read more about it under "Configure social logins" in this README.

If you need to check if the user is logged in and access her user data you can
use something like:

```ruby
<% if user_signed_in? %>
  Hi <%= current_user.username %>!
<% end %>
```

### Forgot Password

  * Link to - <tt>link_to 'Forgot password', new_user_password_path</tt>
  * URL example - http://localhost:3000/password/new
  * View template - <tt>app/views/hive/passwords/new.html.haml</tt>
  * Mail template - TODO

When users request to reset their password we send them an email to to the address
specified in their account. When clicking the link in that email they brought to
<tt>/account/password/new</tt> where the can create a new password.


### Manage account

  * Link to - <tt>link_to 'Manage account', edit_user_registration_path</tt>
  * URL example - http://localhost:3000/account/edit
  * View template - <tt>app/views/hive/registrations/edit.html.haml</tt>


The manage account page show a little widget that allows users to add a avatar
by uploading a image from their computer. Read more about "Configure avatars"
in this README.


### Logout/Sign-out

  * Link to - <tt>link_to 'Logout', destroy_user_session_path, method: :delete</tt>
  * URL example - http://localhost:3000/account/logout

Make sure you have added <tt>method: :delete</tt> to the link or the logout won't work!


### Delete account

  * Link to - <tt>link_to 'Manage account', edit_user_registration_path</tt>
  * URL example - http://localhost:3000/account/edit
  * View template - <tt>app/views/hive/registrations/edit.html.haml</tt>

At the end of the account management page there is a option to delete
the users account. Checkout the following config options in the Hive initializer:

* <tt>deletable</tt> - Defaults to *true* and allows users to delete their
account. If set to *false* users won't be able to delete their account.

* <tt>delete_requires_password</tt> - Defaults to *true* and users must
confirm the account delete with their current password.


### Manage authentifications (aka social logins)

TODO: Have to decide if this is gonna stay. If yes add link and template
and link to "Configure social logins" in this README.


### Mails

TODO: Wirte about when and where mails are send and remind user of changing
<tt>config.mailer_sender</tt> in the Hive initializer.




Because Hive is based on [Devise](https://github.com/plataformatec/devise)
you can checkout their documentation if you are interested in how everything works.


## The layout

Hive comes with a nice layout for login, sign-up, lost password, edit account
and all its other pages. This is based on  [Twitter Bootstrap 3](http://getbootstrap.com/).
We added Bootstrap to your App during setup by requiring it in
<tt>app/assets/javascripts/application.js</tt> and
<tt>app/assets/stylesheets/application.css</tt>. If you already use Bootstrap 3
in your App you can replace the <tt>require hive</tt> entries in both files with
<tt>require hive_without_bootstrap</tt>.

Hive by default uses your main application layout file from
<tt>app/views/layouts/application.html.erb</tt>. You can change that in the Hive
initializer. To use a custom layout from <tt>app/views/layouts/hive_custom_layout.html.erb</tt>:

```ruby
config.layout = 'hive_custom_layout'
```

To specify individual layouts for controllers and actions:

```ruby
config.layout = {
  'default' => 'application',
  'registrations' => { 'edit' => 'custom_registration_edit_layout', 'update' => 'custom_registration_update_layout' },
  'sessions' => { 'new' => 'custom_login_layout' }
}
```

### Flash messages

Make sure you have a container for [flash messages](http://guides.rubyonrails.org/action_controller_overview.html#the-flash)
in your layout file. If you like you can add a partial that comes with Hive
to your <tt>app/views/layouts/application.html.erb</tt> layout file:

```ruby
<%= render 'hive/shared/flash' %>
```

This partial also renders a container for flash messages from
[Javascript xhr responses](http://guides.rubyonrails.org/working_with_javascript_in_rails.html).
We use the [Glow Gem](https://github.com/zweitag/glow) for that.

This works by adding the flash message to a special header in the server response
and by binding to the Javascript event <tt>glow:flash</tt> in the client and showing
the flash message on the website. If you want to do your own stuff with the flash
message you can unbind from that event and bind it again:

```javascript
  $(document).unbind('glow:flash').bind('glow:flash', function(evt, flash) {
    alert(flash.type, flash.message)
  });
```

### Animations

Hive uses animations when showing the different views for like sign-in and sign-up.
If you get dizzy, you can disable that in the Hive initializer by specifying:

```ruby
config.animate_views = false
```

### Customisation

TODO: Write about how to modify view templates and css.
View generator must work!


## Configure avatars

Hive comes with a preconfigured user avatar so users can upload a image
and use it as their profile picture.

The <tt>registrations#edit</tt> view has a nice little widget that allows
users to select a image file from their computer select a crop and save it.

To display the avatar in your views use

```ruby
<%= devise_avatar_for current_user, :avatar %>
```

This will render a image tag with the current users avatar.

The default avatar configuration allows to upload jpg, gif or png image files,
select a square crop from the image and resize the final image to 200x200 pixels.

Hive uses [DeviseAvatarable](http://github.com/schneikai/devise_avatarable)
to configure social logins. Checkout the project README for more infos and
configuration options.


## Configure social logins

That is easy as adding your *APP-ID* and *APP-secret* to the Hive initializer.
For example to add a social login for Twitter just go to https://dev.twitter.com/apps,
register your App-ID and -secret and put it in the Hive initializer like this:

```ruby
config.omniauth :twitter, 'YOUR_APP_ID', 'YOUR_APP_SECRET'
```

That's it. Your users can now login and sign-up via their Twitter account.

Hive uses [DeviseEasyOmniauthable](http://github.com/schneikai/devise_easy_omniauthable)
to configure social logins. Checkout the project README for more infos and
configuration options.


## Configure user roles and access

Roles are added and managed via the console like this:

```console
@user.roles # Get all roles of the current user
=> [:guest]

@user.has_role? :admin # Check if the user has the specified role.
=> false

@user.add_role :admin # Add the admin role to the current user.

@user.delete_role :admin # Remove the admin role from the current user
```

Access rights (aka abilities) are configured via <tt>app/modes/user_abilitiy.rb</tt>
that was created during setup. Checkout that file on how to add abilities.

Hive uses [DeviseAuthorizable](http://github.com/schneikai/devise_authorizable)
to manage roles and access abilities. Checkout the project README for more infos
and configuration options.


## Add more attributes to your user model

TODO! write about how to add and remove. How to show fields in signup and edit account.


## Translations

Katalog uses the following [locales](https://github.com/schneikai/katalog/blob/master/config/locales).
Add or change translations by adding or overwriting these files in your app.


## TODO
* make the sign_in_status nicer. use something from bootstrap?
  maybe just use the navbar? maybe in a helper method that allows a block for the
  main menue?
* show how to add fullscreen backgrounds to the Hive dialogs.
* show how to add a logo instead of just a text headline in Hive dialogs.
* in Photocase we don't allow users to cancel so this is not yet tested (and the views are not styled/checked)
* validations do not work for change password (via email reset token) and maybe others too?
* create a generator to copy the layouts to the host app just like Devise
  in the install README we say the command is "rails g hive:views"
* should be ensure authorisation by default? https://github.com/ryanb/cancan/wiki/Ensure-Authorization
* it does not show error messages about wrong username or password on login
* make the login path /login instead of /users/login?
* is Devise unlock used? If yes, we need to style the templates
* add a user account administration
* add a example layout file that show where the flash messages partial and login status partial should go.
* add something to the readme about how to setup the main apps app layout for
  TWBS 3 (html5 doctype, meta-viewport tag, ...) http://getbootstrap.com/css/

Maybe
* Make the path helpers nicer? *user_login_path* instead of *new_user_session_path*
* put validations in extra gem (routes, validations.js, validations controller)
  but first check if there is a more sophisticated gem for client side validations
  we could use.
* add devise invitable?
* let admins or moderators activate accounts instead of sending activation emails
  https://github.com/plataformatec/devise/wiki/How-To:-Require-admin-to-activate-account-before-sign_in
* let users pick a password on activation instead of on registration (makes registartion more easy)
  https://github.com/plataformatec/devise/wiki/How-To:-Override-confirmations-so-users-can-pick-their-own-passwords-as-part-of-confirmation-activation


## Licence

MIT-LICENSE. Copyright 2014 Kai Schneider.
